import { EmbedBuilder } from "discord.js";
import { GameSummary } from "../service/PWHL/models/GameSummaryResponse";
import { PBPEvent } from "../service/PWHL/models/PlayByPlayResponse";
import { ScheduleGame } from "../service/PWHL/models/ScheduleResponse";
import { Game } from "../service/PWHL/models/ScorebarResponse";
import { TeamStanding } from "../service/PWHL/models/StandingsResponse";
import { Colors, Environment } from "./constants";
import { EmojiCache } from "./EmojiCache";

/**
 * All PWHL embed formatters - goals, penalties, period ends, and game end
 */

export const PWHLScheduleEmbedBuilder = async (
	games: ScheduleGame[] | Game[],
	title: string
): Promise<EmbedBuilder> => {
	const embed = new EmbedBuilder().setTitle(`PWHL ${title} Schedule`).setColor(Colors.KRAKEN_EMBED);

	if (!games || games.length === 0) {
		embed.setDescription("No games scheduled");
		return embed;
	}

	// Determine if we're working with ScheduleGame or Game (Scorebar)
	const isScorebarGame = (game: ScheduleGame | Game): game is Game => {
		return "HomeCode" in game;
	};

	const fields = games.map((game) => {
		let homeTeam: string;
		let awayTeam: string;
		let homeScore: string | undefined;
		let awayScore: string | undefined;
		let gameStatus: string;
		let gameTime: string;
		let venue: string;

		if (isScorebarGame(game)) {
			// Scorebar format
			homeTeam = game.HomeCode;
			awayTeam = game.VisitorCode;
			homeScore = game.HomeGoals;
			awayScore = game.VisitorGoals;
			gameStatus = game.GameStatusStringLong;
			gameTime = game.ScheduledFormattedTime;
			venue = `${game.Venue}, ${game.VenueLocation}`;
		} else {
			// Schedule format
			homeTeam = game.home_team_code;
			awayTeam = game.visiting_team_code;
			homeScore = game.home_goal_count;
			awayScore = game.visiting_goal_count;
			gameStatus = game.game_status;
			gameTime = game.date_with_day;
			venue = `${game.venue_name}, ${game.venue_location}`;
		}

		const homeEmoji = EmojiCache.getPWHLTeamEmoji(homeTeam);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(awayTeam);

		const homeDisplay = `${homeEmoji ? homeEmoji + " " : ""}${homeTeam}`;
		const awayDisplay = `${awayEmoji ? awayEmoji + " " : ""}${awayTeam}`;

		let matchupLine: string;
		if (homeScore && awayScore) {
			matchupLine = `${awayDisplay} ${awayScore} @ ${homeDisplay} ${homeScore}`;
		} else {
			matchupLine = `${awayDisplay} @ ${homeDisplay}`;
		}

		const details = [`${gameTime}`, `Status: ${gameStatus}`, `${venue}`].join("\n");

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

	const fields = games.map((game) => {
		const homeEmoji = EmojiCache.getPWHLTeamEmoji(game.HomeCode);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(game.VisitorCode);

		const homeDisplay = `${homeEmoji ? homeEmoji + " " : ""}${game.HomeCode}`;
		const awayDisplay = `${awayEmoji ? awayEmoji + " " : ""}${game.VisitorCode}`;

		const homeScoreDisplay = game.HomeGoals || "0";
		const awayScoreDisplay = game.VisitorGoals || "0";

		const matchupLine = `${awayDisplay} ${awayScoreDisplay} @ ${homeDisplay} ${homeScoreDisplay}`;

		const detailLines = [];

		// Game status
		detailLines.push(`Status: ${game.GameStatusStringLong}`);

		// Period and clock if in progress
		if (game.Period && game.Clock && game.GameStatus !== "4") {
			detailLines.push(`${game.PeriodNameShort} - ${game.Clock}`);
		}

		// Shots if available
		if (game.HomeShots && game.VisitorShots) {
			detailLines.push(`Shots: ${game.VisitorShots} - ${game.HomeShots}`);
		}

		// Venue
		detailLines.push(`${game.Venue}, ${game.VenueLocation}`);

		return {
			name: matchupLine,
			value: detailLines.join("\n"),
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
		const emoji = EmojiCache.getPWHLTeamEmoji(standing.team_code);
		const teamDisplay = `${emoji ? emoji + " " : ""}**${standing.team_code}** ${standing.name}`;
		const rankDisplay = `${index + 1}. ${teamDisplay}`;

		const record = `${standing.wins}-${standing.losses}-${standing.ot_losses}`;
		const detailLines = [
			`Record: ${record}`,
			`Points: ${standing.points}`,
			`GP: ${standing.games_played}`,
			`GF: ${standing.goals_for} | GA: ${standing.goals_against}`,
			`Streak: ${standing.streak}`,
			`Last 10: ${standing.last_ten}`,
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

export const PWHLGoalEmbedBuilder = (goal: PBPEvent, gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta } = gameSummary;

	// Determine which team scored (home="1", visitor="0")
	const scoringTeam = goal.home === "1" ? home : visitor;
	const opposingTeam = goal.home === "1" ? visitor : home;

	// Check if this is our favorite team scoring
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const isFavoriteTeamGoal = favoriteTeamId && scoringTeam.id === favoriteTeamId;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);
	const scoringEmoji = goal.home === "1" ? homeEmoji : awayEmoji;

	// Build scorer and assists text
	const scorerName = goal.goal_scorer
		? `${goal.goal_scorer.first_name} ${goal.goal_scorer.last_name} (${goal.scorer_goal_num || "1"})`
		: "Unknown";

	const unassisted = !goal.assist1_player && !goal.assist2_player;

	// Determine special goal types and shot type
	const specialTypes: string[] = [];
	if (goal.power_play === "1") specialTypes.push("Power play");
	if (goal.short_handed === "1") specialTypes.push("Shorthanded");
	if (goal.empty_net === "1") specialTypes.push("Empty net");
	if (goal.penalty_shot === "1") specialTypes.push("Penalty shot");
	const strengthText = specialTypes.length > 0 ? ` - ${specialTypes.join(", ")}` : "";

	// Build description
	let description = isFavoriteTeamGoal ? `### ${scorerName}` : scorerName;
	description += `${unassisted ? " - Unassisted" : ""}${strengthText}`;

	// Add JAILBREAK for shorthanded goals
	if (goal.short_handed === "1") {
		description += "\n\n**JAILBREAK**";
	}

	// Build title
	const goalText = isFavoriteTeamGoal ? "goal!" : "goal";
	const title = `${scoringEmoji ? scoringEmoji + " " : ""}${scoringTeam.name} ${goalText}`;

	// Build fields for assists and score
	const fields = [];
	if (goal.assist1_player) {
		fields.push({
			name: "1st Assist:",
			value: `${goal.assist1_player.first_name} ${goal.assist1_player.last_name} (${goal.assist1_player.jersey_number})`,
		});
	}
	if (goal.assist2_player) {
		fields.push({
			name: "2nd Assist:",
			value: `${goal.assist2_player.first_name} ${goal.assist2_player.last_name} (${goal.assist2_player.jersey_number})`,
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
			name: `${awayEmoji ? awayEmoji + " " : ""}**${visitor.name}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: `${homeEmoji ? homeEmoji + " " : ""}**${home.name}**`,
			value: `Goals: **${homeScore}**\nShots: ${homeShots}`,
			inline: true,
		}
	);

	const timeRemainingString = `${goal.time_formatted} remaining in the ${goal.period} period`;

	// Build headshot URL
	const headshotUrl = goal.goal_scorer?.player_id
		? `https://assets.leaguestat.com/pwhl/240x240/${goal.goal_scorer.player_id}.jpg`
		: undefined;

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.addFields(fields)
		.setThumbnail(headshotUrl || null)
		.setFooter({ text: timeRemainingString })
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};

export const PWHLPenaltyEmbedBuilder = (penalty: PBPEvent, gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor } = gameSummary;

	// Determine which team got the penalty
	const penaltyTeam = penalty.team_id === home.id ? home : visitor;

	// Check if this penalty is against our favorite team (we like penalties against opponents)
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const isPenaltyAgainstOpponent = favoriteTeamId && penalty.team_id !== favoriteTeamId;

	// Get team emoji
	const teamEmoji = EmojiCache.getPWHLTeamEmoji(penaltyTeam.code);

	const playerName = penalty.player_penalized_info
		? `${penalty.player_penalized_info.first_name} ${penalty.player_penalized_info.last_name}`
		: "Unknown";

	const penaltyText = isPenaltyAgainstOpponent ? "penalty!" : "penalty";
	const title = `${teamEmoji ? teamEmoji + " " : ""}${penaltyTeam.name} ${penaltyText}`;

	// Build description with infraction details
	const infraction = penalty.lang_penalty_description || penalty.offence || "Unknown";
	const description =
		`**Infraction:**\n${infraction}\n\n` +
		`**Committed by**\n${playerName}` +
		(penalty.player_served_info
			? `\n\n**Drawn by:**\n${penalty.player_served_info.first_name} ${penalty.player_served_info.last_name}`
			: "");

	const timeString = `${penalty.time_off_formatted || penalty.time_formatted} remaining in the ${
		penalty.period
	} period`;

	// Build headshot URL
	const headshotUrl = penalty.player_penalized_info?.player_id
		? `https://assets.leaguestat.com/pwhl/240x240/${penalty.player_penalized_info.player_id}.jpg`
		: undefined;

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setThumbnail(headshotUrl || null)
		.setFooter({ text: timeString })
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};

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
			name: `${awayEmoji ? awayEmoji + " " : ""}**${visitor.name}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: `${homeEmoji ? homeEmoji + " " : ""}**${home.name}**`,
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
			name: `${awayEmoji ? awayEmoji + " " : ""}**${visitor.name}**`,
			value: `Goals: **${awayScore}**\nShots: ${awayShots}`,
			inline: true,
		},
		{
			name: `${homeEmoji ? homeEmoji + " " : ""}**${home.name}**`,
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
	const title = `${winningEmoji ? winningEmoji + " " : ""}${winningTeam.name} ${winText}`;

	// Build fields for final score and stats
	const fields = [
		{
			name: `${awayEmoji ? awayEmoji + " " : ""}**${visitor.name}**`,
			value: `Goals: **${awayScore}**\nShots: ${summaryAny.totalShots?.visitor || 0}`,
			inline: true,
		},
		{
			name: `${homeEmoji ? homeEmoji + " " : ""}**${home.name}**`,
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
