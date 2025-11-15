import { ThreadChannel } from "discord.js";
import { Config } from "../../../utils/constants";
import { MLBPosition } from "../../../utils/enums";
import { delay } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { MLBGameFeedEmbedFormatter } from "../../../utils/MLBEmbedFormatters";
import { API } from "../API";
import { Play } from "../models/GameFeed";

// Replays a completed MLB game for debugging
export class MLBGameReplayManager {
	private thread: ThreadChannel;
	private gameId: string;

	constructor(thread: ThreadChannel, gameId: string) {
		this.thread = thread;
		this.gameId = gameId;
	}

	public async start(): Promise<void> {
		try {
			Logger.info(`[MLB] Starting replay for game ${this.gameId}`);

			const feed = await API.LiveGames.ById(this.gameId);
			const embedFormatter = new MLBGameFeedEmbedFormatter(feed);
			const { teams } = feed.gameData;
			const allPlays = feed.liveData.plays.allPlays;
			const notablePlays = allPlays.filter(Config.doesThisMLBPlayMatter);
			const inningTransitions = this.findInningTransitions(allPlays);

			await this.thread.send({
				content: `**MLB Game Replay**: ${teams.away.teamName} @ ${teams.home.teamName}`,
			});

			// Process each notable at-bat
			for (let i = 0; i < notablePlays.length; i++) {
				const play = notablePlays[i];

				if (!play.about.isComplete) continue;

				// Check for pitching changes
				const substitution = play.playEvents.find(
					(e) => e.isSubstitution && e.position?.code === MLBPosition.pitcher,
				);
				if (substitution) {
					const embed = embedFormatter.createPitchingChangeEmbed(play);
					if (embed) {
						await this.thread.send({ embeds: [embed] });
						await delay(500);
					}
				}

				const embed = embedFormatter.createPlayEmbed(play);
				if (embed) {
					await this.thread.send({ embeds: [embed] });
					await delay(1000);
				}

				// Post any inning end messages that occur between this play and the next
				await this.postInningTransitions(
					play.atBatIndex,
					notablePlays[i + 1]?.atBatIndex,
					inningTransitions,
					embedFormatter,
				);
			}

			// Post game end summary
			const gameEndEmbed = embedFormatter.createGameEndEmbed();
			if (gameEndEmbed) {
				await this.thread.send({ embeds: [gameEndEmbed] });
			}

			await this.thread.send({ content: "**Replay complete**" });
			Logger.info(`[MLB] Completed replay for game ${this.gameId}`);
		} catch (error) {
			await this.thread.send({ content: `Error replaying game: ${error}` });
			Logger.error(`[MLB] Error replaying game ${this.gameId}:`, error);
		}
	}

	// Returns a map of atBatIndex -> Play for the last play of each half-inning.
	private findInningTransitions(allPlays: Play[]): Map<number, Play> {
		const transitions = new Map<number, Play>();

		for (let i = 0; i < allPlays.length - 1; i++) {
			const currentPlay = allPlays[i];
			const nextPlay = allPlays[i + 1];

			const inningChanged = nextPlay.about.inning !== currentPlay.about.inning;
			const halfInningChanged = nextPlay.about.halfInning !== currentPlay.about.halfInning;
			if (inningChanged || halfInningChanged) {
				transitions.set(currentPlay.atBatIndex, currentPlay);
			}
		}
		return transitions;
	}

	// Posts inning end messages for any transitions between two plays.
	private async postInningTransitions(
		currentIndex: number,
		nextIndex: number | undefined,
		transitions: Map<number, Play>,
		embedFormatter: MLBGameFeedEmbedFormatter,
	): Promise<void> {
		const nextNotableIndex = nextIndex ?? Infinity;
		const transitionIndexes = Array.from(transitions.keys());

		for (const transitionIndex of transitionIndexes) {
			if (transitionIndex > currentIndex && transitionIndex < nextNotableIndex) {
				const transitionPlay = transitions.get(transitionIndex);
				if (transitionPlay) {
					const inningEndEmbed = embedFormatter.createInningEndEmbed(transitionPlay, nextIndex);
					if (inningEndEmbed) {
						await this.thread.send({ embeds: [inningEndEmbed] });
						await delay(500);
					}
					transitions.delete(transitionIndex);
				}
			}
		}
	}
}
