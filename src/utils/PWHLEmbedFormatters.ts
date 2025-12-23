import { EmbedBuilder } from "discord.js";
import { GameSummary } from "../service/PWHL/models/GameSummaryResponse";
import { ScheduleGame } from "../service/PWHL/models/ScheduleResponse";
import { Game } from "../service/PWHL/models/ScorebarResponse";
import { TeamStanding } from "../service/PWHL/models/StandingsResponse";
import { GoalEvent, PenaltyEvent } from "../service/PWHL/models/LiveGameResponse";
import { Colors, Config, Environment, Strings } from "./constants";
import { EmojiCache } from "./EmojiCache";
import { format, utcToZonedTime } from "date-fns-tz";
import { relativeDateString } from "./helpers";

/**
 * All PWHL embed formatters - goals, penalties, period ends, period starts, and game end
 */

/**
 * Build embed for PWHL schedule (upcoming/scheduled games)
 */
export const PWHLScheduleEmbedBuilder = async (games: ScheduleGame[], title: string): Promise<EmbedBuilder> => {
	const embed = new EmbedBuilder().setTitle(`PWHL ${title} Schedule`).setColor(Colors.KRAKEN_EMBED);

	if (!games || games.length === 0) {
		embed.setDescription("No games scheduled");
		return embed;
	}

	const fields = games.map((game) => {
		const {
			home_team_code,
			visiting_team_code,
			home_goal_count,
			visiting_goal_count,
			GameDateISO8601,
			venue_name,
		} = game;

		const homeEmoji = EmojiCache.getPWHLTeamEmoji(home_team_code);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(visiting_team_code);

		const homeDisplay = `${homeEmoji ?? ""}${home_team_code}`;
		const awayDisplay = `${awayEmoji ?? ""}${visiting_team_code}`;

		let matchupLine: string;
		if (parseInt(home_goal_count) && parseInt(visiting_goal_count)) {
			// Game has been played or is in progress
			matchupLine = `${awayDisplay} ${visiting_goal_count} @ ${homeDisplay} ${home_goal_count}`;
		} else {
			// Upcoming game
			matchupLine = `${awayDisplay} @ ${homeDisplay}`;
		}

		const gameDate = new Date(GameDateISO8601);
		const relativeDate = relativeDateString(gameDate.toISOString());
		const startDateZoned = utcToZonedTime(gameDate, Config.TIME_ZONE);
		const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);

		const details = [`${gameStartTimeString} (${relativeDate})`, `${venue_name}`].join("\n");

		return {
			name: matchupLine,
			value: details,
			inline: false,
		};
	});

	embed.addFields(fields);
	return embed;
};

export const PWHLScoresEmbedBuilder = async (games: Game[], title: string): Promise<EmbedBuilder> => {
	const embed = new EmbedBuilder().setTitle(`PWHL ${title}`).setColor(Colors.KRAKEN_EMBED);

	if (!games || games.length === 0) {
		embed.setDescription("No games found");
		return embed;
	}

	// Debug: log first game to see all available fields
	if (games.length > 0) {
		console.log("[PWHL] Sample game data:", JSON.stringify(games[0], null, 2));
	}

	const fields = games.map((game) => {
		const {
			HomeCode,
			VisitorCode,
			VisitorGoals,
			HomeGoals,
			GameStatus,
			GameStatusStringLong,
			ScheduledFormattedTime,
			PeriodNameShort,
			Clock,
			HomeShots,
			VisitorShots,
		} = game;

		const homeEmoji = EmojiCache.getPWHLTeamEmoji(HomeCode);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(VisitorCode);

		// Build team strings with emoji
		const awayTeamString = awayEmoji ? `${awayEmoji} ${VisitorCode}` : VisitorCode;
		const homeTeamString = homeEmoji ? `${homeEmoji} ${HomeCode}` : HomeCode;

		// Scores
		const awayScore = VisitorGoals || "0";
		const homeScore = HomeGoals || "0";

		// Build matchup line (title format)
		const matchupLine = `${awayTeamString} - ${awayScore}\n${homeTeamString} - ${homeScore}`;

		const detailLines = [];

		// Check if game is final - use GameStatusStringLong for OT/SO detection
		const isFinal = GameStatus === "4"; // Status 4 is typically final

		if (isFinal) {
			const statusLong = GameStatusStringLong.toLowerCase();
			if (statusLong !== "final") {
				detailLines.push(GameStatusStringLong);
			}
		} else if (GameStatus === "1") {
			// Pregame
			detailLines.push(`Pregame - ${ScheduledFormattedTime}`);
		} else {
			// In progress - show period and clock
			if (PeriodNameShort && Clock) {
				detailLines.push(`${PeriodNameShort} - ${Clock}`);
			}
		}

		// Shots if available and game has started
		if (HomeShots && VisitorShots && GameStatus !== "1") {
			const awayShots = `${awayEmoji || VisitorCode} ${VisitorShots}`;
			const homeShots = `${homeEmoji || HomeCode} ${HomeShots}`;
			detailLines.push(`Shots: ${awayShots} ${homeShots}`);
		}

		// TODO: Add game recap/highlights links when available
		// if (game.GameSummaryUrl) {
		// 	detailLines.push(`[Game Summary](${game.GameSummaryUrl})`);
		// }

		const details = detailLines.join("\n");

		return {
			name: matchupLine,
			value: details,
			inline: false,
		};
	});

	embed.addFields(fields);
	return embed;
};

export const PWHLStandingsEmbedBuilder = async (standings: TeamStanding[], title: string): Promise<EmbedBuilder> => {
	const embed = new EmbedBuilder().setTitle(`PWHL ${title}`).setColor(Colors.KRAKEN_EMBED);

	if (!standings || standings.length === 0) {
		embed.setDescription("No standings data available");
		return embed;
	}

	const fields = standings.map((standing, index) => {
		const { team_code, name, wins, losses, ot_losses, points, games_played, goals_for, goals_against, past_10 } =
			standing;

		const emoji = EmojiCache.getPWHLTeamEmoji(team_code!) || "";
		const teamDisplay = `${emoji} ${name}`;
		const rankDisplay = `${index + 1}. ${teamDisplay}`;

		const record = `${wins}-${losses}-${ot_losses}`;
		const detailLines = [
			`Record: ${record}`,
			`Points: ${points}`,
			`GP: ${games_played}`,
			`GF: ${goals_for} | GA: ${goals_against}`,
			`Last 10: ${past_10}`,
		];

		return {
			name: rankDisplay,
			value: detailLines.join("\n"),
			inline: false,
		};
	});

	embed.addFields(fields);
	return embed;
};

export const PWHLGameStartEmbedBuilder = (gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, venue } = gameSummary;
	return new EmbedBuilder()
		.setTitle("Game is starting!")
		.setDescription(`${visitor.name} @ ${home.name}\n\n${venue}`)
		.setColor(0x0099ff)
		.setTimestamp();
};

export function PWHLGoalEmbedBuilder(goal: GoalEvent, gameSummary: GameSummary): EmbedBuilder {
	const { home, visitor, meta } = gameSummary;
	const {
		IsHome,
		ScorerPlayerFirstName,
		ScorerPlayerLastName,
		ScorerGoalNumber,
		ScorerPlayerId,
		Assist1PlayerId,
		Assist1PlayerFirstName,
		Assist1PlayerLastName,
		Assist1PlayerNumAssists,
		Assist2PlayerId,
		Assist2PlayerFirstName,
		Assist2PlayerLastName,
		Assist2PlayerNumAssists,
		PowerPlay,
		ShortHanded,
		EmptyNet,
		PenaltyShot,
		Time,
		PeriodLongName,
	} = goal;

	// Determine which team scored
	const scoringTeam = IsHome ? home : visitor;

	// Check if this is our favorite team scoring
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const isFavoriteTeamGoal = favoriteTeamId && scoringTeam.id === favoriteTeamId;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);
	const scoringEmoji = IsHome ? homeEmoji : awayEmoji;

	// Build scorer text
	const scorerName = `${ScorerPlayerFirstName} ${ScorerPlayerLastName} (${ScorerGoalNumber})`;
	const unassisted = !Assist1PlayerId && !Assist2PlayerId;

	// Determine special goal types
	const specialTypes: string[] = [];
	if (PowerPlay === 1) specialTypes.push("Power play");
	if (ShortHanded === 1) specialTypes.push("Shorthanded");
	if (EmptyNet === 1) specialTypes.push("Empty net");
	if (PenaltyShot === 1) specialTypes.push("Penalty shot");
	const strengthText = specialTypes.length > 0 ? ` - ${specialTypes.join(", ")}` : "";

	// Build description
	let description = isFavoriteTeamGoal ? `### ${scorerName}` : scorerName;
	description += `${unassisted ? " - Unassisted" : ""}${strengthText}`;

	// Add JAILBREAK for shorthanded goals
	if (ShortHanded === 1) {
		description += "\n\n**JAILBREAK**";
	}

	// Build title
	const goalText = isFavoriteTeamGoal ? `goal! ${Strings.REDLIGHT_EMBED}` : "goal";
	const title = scoringEmoji ? `${scoringEmoji} ${scoringTeam.name} ${goalText}` : `${scoringTeam.name} ${goalText}`;

	// Build fields for assists and score
	const fields = [];
	if (Assist1PlayerId) {
		fields.push({
			name: "1st Assist:",
			value: `${Assist1PlayerFirstName} ${Assist1PlayerLastName} (${Assist1PlayerNumAssists})`,
			inline: false,
		});
	}
	if (Assist2PlayerId) {
		fields.push({
			name: "2nd Assist:",
			value: `${Assist2PlayerFirstName} ${Assist2PlayerLastName} (${Assist2PlayerNumAssists})`,
			inline: false,
		});
	}

	// Parse current score from meta
	const scores = meta.quick_score.split("-");
	const awayScore = scores[0] || "0";
	const homeScore = scores[1] || "0";

	// Get shots from meta if available
	const summaryAny = gameSummary as any;
	const awayShots = summaryAny.totalShots?.visitor || "?";
	const homeShots = summaryAny.totalShots?.home || "?";

	fields.push(
		{
			name: awayEmoji ? `${awayEmoji} **${visitor.code}**` : `**${visitor.code}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: homeEmoji ? `${homeEmoji} **${home.code}**` : `**${home.code}**`,
			value: `Goals: **${homeScore}**\nShots: ${homeShots}`,
			inline: true,
		},
	);

	const timestamp = `${Time} in the ${PeriodLongName} period`;

	// Build headshot URL
	const headshotUrl = ScorerPlayerId ? `https://assets.leaguestat.com/pwhl/240x240/${ScorerPlayerId}.jpg` : undefined;

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.addFields(fields)
		.setThumbnail(headshotUrl || null)
		.setFooter({ text: timestamp })
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
}

export function PWHLPenaltyEmbedBuilder(penalty: PenaltyEvent, gameSummary: GameSummary): EmbedBuilder {
	const { home, visitor } = gameSummary;
	const {
		Home,
		PenalizedPlayerFirstName,
		PenalizedPlayerLastName,
		PenalizedPlayerId,
		ServedPlayerId,
		ServedPlayerFirstName,
		ServedPlayerLastName,
		OffenceDescription,
		Minutes,
		Time,
		Period,
	} = penalty;

	// Determine which team got the penalty (Home=1, not Home=0)
	const penaltyTeam = Home === 1 ? home : visitor;

	// Check if this penalty is against our favorite team (we like penalties against opponents)
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const isPenaltyAgainstOpponent = favoriteTeamId && penaltyTeam.id !== favoriteTeamId;

	// Get team emoji
	const teamEmoji = EmojiCache.getPWHLTeamEmoji(penaltyTeam.code);

	const playerName = `${PenalizedPlayerFirstName} ${PenalizedPlayerLastName}`;

	const penaltyText = isPenaltyAgainstOpponent ? "penalty!" : "penalty";
	const title = teamEmoji ? `${teamEmoji} ${penaltyTeam.name} ${penaltyText}` : `${penaltyTeam.name} ${penaltyText}`;

	// Build description with infraction details
	const infraction = `${OffenceDescription} - ${Minutes} minutes`;

	let description = `**Infraction:**\n${infraction}\n\n**Committed by**\n${playerName}`;

	// Add "Served by" if penalty is served by a different player (e.g., goalie penalties)
	if (ServedPlayerId && ServedPlayerId !== PenalizedPlayerId) {
		description += `\n**Served by:** ${ServedPlayerFirstName} ${ServedPlayerLastName}`;
	}

	const timeString = `${Time} into the ${Period}${Period === 1 ? "st" : Period === 2 ? "nd" : Period === 3 ? "rd" : "th"} period`;

	// Build headshot URL
	const headshotUrl = PenalizedPlayerId
		? `https://assets.leaguestat.com/pwhl/240x240/${PenalizedPlayerId}.jpg`
		: undefined;

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setThumbnail(headshotUrl || null)
		.setFooter({ text: timeString })
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
}

export const PWHLPeriodEndEmbedBuilder = (periodNumber: number, gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta } = gameSummary;
	const summaryAny = gameSummary as any;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	// Parse current score
	const scores = meta.quick_score.split("-");
	const awayScore = scores[0] || "0";
	const homeScore = scores[1] || "0";

	// Get shots if available
	const awayShots = summaryAny.totalShots?.visitor || "?";
	const homeShots = summaryAny.totalShots?.home || "?";

	const periodName =
		periodNumber === 4 ? "OT" : `${periodNumber}${periodNumber === 1 ? "st" : periodNumber === 2 ? "nd" : "rd"}`;

	const fields = [
		{
			name: awayEmoji ? `${awayEmoji} **${visitor.code}**` : `**${visitor.code}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: homeEmoji ? `${homeEmoji} **${home.code}**` : `**${home.code}**`,
			value: `Goals: **${homeScore}**\nShots: ${homeShots}`,
			inline: true,
		},
	];

	return new EmbedBuilder()
		.setTitle(`${periodName} period has ended.`)
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};

export const PWHLPeriodStartEmbedBuilder = (periodNumber: number, gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta } = gameSummary;
	const summaryAny = gameSummary as any;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	// Parse current score
	const scores = meta.quick_score.split("-");
	const awayScore = scores[0] || "0";
	const homeScore = scores[1] || "0";

	// Get shots if available
	const awayShots = summaryAny.totalShots?.visitor || "?";
	const homeShots = summaryAny.totalShots?.home || "?";

	const periodName =
		periodNumber === 4 ? "OT" : `${periodNumber}${periodNumber === 1 ? "st" : periodNumber === 2 ? "nd" : "rd"}`;

	const fields = [
		{
			name: awayEmoji ? `${awayEmoji} **${visitor.code}**` : `**${visitor.code}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: homeEmoji ? `${homeEmoji} **${home.code}**` : `**${home.code}**`,
			value: `Goals: **${homeScore}**\nShots: ${homeShots}`,
			inline: true,
		},
	];

	return new EmbedBuilder()
		.setTitle(`${periodName} period has started.`)
		.setDescription(`${periodName} period has started.`)
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};

export const PWHLGameEndEmbedBuilder = (gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta } = gameSummary;
	const summaryAny = gameSummary as any;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	// Parse score
	const scores = meta.quick_score.split("-");
	const awayScore = parseInt(scores[0] || "0");
	const homeScore = parseInt(scores[1] || "0");

	const winningTeam = homeScore > awayScore ? home : visitor;
	const winningEmoji = homeScore > awayScore ? homeEmoji : awayEmoji;

	// Did we win?
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const weWon = favoriteTeamId && winningTeam.id === favoriteTeamId;

	const winText = weWon ? "WIN!" : "win";
	const title = winningEmoji ? `${winningEmoji} ${winningTeam.name} ${winText}` : `${winningTeam.name} ${winText}`;

	// Build fields for final score and stats
	const fields = [
		{
			name: awayEmoji ? `${awayEmoji} **${visitor.code}**` : `**${visitor.code}**`,
			value: `Goals: **${awayScore}**\nShots: ${summaryAny.totalShots?.visitor || 0}`,
			inline: true,
		},
		{
			name: homeEmoji ? `${homeEmoji} **${home.code}**` : `**${home.code}**`,
			value: `Goals: **${homeScore}**\nShots: ${summaryAny.totalShots?.home || 0}`,
			inline: true,
		},
	];

	// Add game stats if available
	if (summaryAny.powerPlayCount) {
		const ppText = `${summaryAny.powerPlayCount.visitor || 0} - ${summaryAny.powerPlayCount.home || 0}`;
		fields.push({
			name: "Power Play Opportunities",
			value: ppText,
			inline: false,
		});
	}

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription("**Final Score**")
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};
