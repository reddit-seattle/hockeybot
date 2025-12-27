import { EmbedBuilder } from "discord.js";
import { GameSummary } from "../service/PWHL/models/GameSummaryResponse";
import { ScheduleGame } from "../service/PWHL/models/ScheduleResponse";
import { Game } from "../service/PWHL/models/ScorebarResponse";
import { TeamStanding } from "../service/PWHL/models/StandingsResponse";
import { GoalEvent, PenaltyEvent } from "../service/PWHL/models/LiveGameResponse";
import { Colors, Config, Environment, Paths, Strings } from "./constants";
import { EmojiCache } from "./EmojiCache";
import { PWHLGameStatus } from "./enums";
import { format, utcToZonedTime } from "date-fns-tz";
import { relativeDateString, formatPWHLPeriodName } from "./helpers";

/**
 * All PWHL embed formatters - goals, penalties, period ends, period starts, and game end
 */

/**
 * Build embed for PWHL game announcement (gameday thread anchor)
 */
export const PWHLGameAnnouncementEmbedBuilder = async (game: Game): Promise<EmbedBuilder> => {
	// Format date/time
	const gameDate = new Date(game.GameDateISO8601);
	const relativeDate = relativeDateString(gameDate.toISOString());
	const startDateZoned = utcToZonedTime(gameDate, Config.TIME_ZONE);
	const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);

	// Get team names
	const homeTeam = game.HomeLongName;
	const awayTeam = game.VisitorLongName;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(game.HomeCode);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(game.VisitorCode);

	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const favoriteTeamName = Environment.HOCKEYBOT_PWHL_TEAM_NAME;
	let title: string;
	let embedColor: number = 0x0099ff; // Default color

	if (favoriteTeamId && (game.HomeID === favoriteTeamId || game.VisitorID === favoriteTeamId)) {
		// Add emoji to title
		const ourTeamEmoji = game.HomeID === favoriteTeamId ? homeEmoji : awayEmoji;
		title = ourTeamEmoji ? `${ourTeamEmoji} ${favoriteTeamName} game today!` : `${favoriteTeamName} game today!`;
		embedColor = Colors.KRAKEN_EMBED; // Could make this configurable
	} else {
		const awayDisplay = awayEmoji ? `${awayEmoji} ${awayTeam}` : awayTeam;
		const homeDisplay = homeEmoji ? `${homeTeam} ${homeEmoji}` : homeTeam;
		title = `${awayDisplay} vs ${homeDisplay}`;
	}

	// Create preview embed
	const venue = game.venue_name || game.venue_location || "Venue TBA";
	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(`Game start: ${gameStartTimeString} (${relativeDate})\n${venue}`)
		.setColor(embedColor);
};

/**
 * Build embed for PWHL schedule (upcoming/scheduled games)
 */
export const PWHLScheduleEmbedBuilder = async (games: ScheduleGame[], title: string): Promise<EmbedBuilder> => {
	const embed = new EmbedBuilder().setTitle(title).setColor(Colors.KRAKEN_EMBED);

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
			started,
		} = game;

		const homeEmoji = EmojiCache.getPWHLTeamEmoji(home_team_code);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(visiting_team_code);

		const homeDisplay = `${homeEmoji ?? ""}${home_team_code}`;
		const awayDisplay = `${awayEmoji ?? ""}${visiting_team_code}`;

		let matchupLine: string;
		if (started === "1") {
			// Game has started or is completed
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

	const fields = games.map((game) => {
		const {
			HomeCode,
			VisitorCode,
			VisitorGoals,
			HomeGoals,
			GameStatus,
			GameStatusStringLong,
			ScheduledFormattedTime,
			HomeShots,
			VisitorShots,
			venue_name,
		} = game;

		const homeEmoji = EmojiCache.getPWHLTeamEmoji(HomeCode);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(VisitorCode);

		// Build team strings with emoji
		const awayTeamString = awayEmoji ? `${awayEmoji} ${VisitorCode}` : VisitorCode;
		const homeTeamString = homeEmoji ? `${homeEmoji} ${HomeCode}` : HomeCode;

		// if game has not started, show schedule
		const gameStarted = GameStatus !== PWHLGameStatus.Pregame;
		if (!gameStarted) {
			const gameDate = new Date(game.GameDateISO8601);
			const relativeDate = relativeDateString(gameDate.toISOString());
			const startDateZoned = utcToZonedTime(gameDate, Config.TIME_ZONE);
			const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);
			return {
				name: `${awayTeamString} @ ${homeTeamString}`,
				value: `${gameStartTimeString} (${relativeDate})\n${venue_name}`,
				inline: false,
			};
		}

		// Scores
		const awayScore = VisitorGoals || "0";
		const homeScore = HomeGoals || "0";

		// Build matchup line (title format)
		const matchupLine = `${awayTeamString} - ${awayScore}\n${homeTeamString} - ${homeScore}`;

		const detailLines = [];
		if (GameStatus === PWHLGameStatus.Pregame) {
			detailLines.push(`Pregame - ${ScheduledFormattedTime}`);
		} else {
			detailLines.push(`${GameStatusStringLong}`);
		}

		// Shots if available and game has started
		if (HomeShots && VisitorShots && GameStatus !== PWHLGameStatus.Pregame) {
			const awayShots = `${awayEmoji || VisitorCode} ${VisitorShots}`;
			const homeShots = `${homeEmoji || HomeCode} ${HomeShots}`;
			detailLines.push(`Shots: ${awayShots} ${homeShots}`);
		}
		// TODO: Add game recap/highlights links when available
		// if (game.GameSummaryUrl) {
		// 	detailLines.push(`[Game Summary](${game.GameSummaryUrl})`);
		// }

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
		const {
			team_code,
			name,
			games_played,
			regulation_wins,
			non_reg_wins,
			losses,
			points,
			goals_for,
			goals_against,
			non_reg_losses,
			streak,
		} = standing;

		const emoji = EmojiCache.getPWHLTeamEmoji(team_code!) || "";
		const teamDisplay = `${emoji} ${name}`;
		const rankDisplay = `${index + 1}. ${teamDisplay} [${points}]`;

		const diff = (Number(goals_for) || 0) - (Number(goals_against) || 0);
		const diffDisplay = diff > 0 ? `+${diff}` : `${diff}`;
		const record = `${regulation_wins}-${non_reg_wins}-${non_reg_losses}-${losses}`;

		return {
			name: rankDisplay,
			value: `${record} | Streak: ${streak}, Diff: ${diffDisplay}, GP: ${games_played}`,
			inline: false,
		};
	});

	embed.addFields(fields);
	return embed;
};

export const PWHLGameStartEmbedBuilder = (gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, venue } = gameSummary;

	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	const awayDisplay = awayEmoji ? `${awayEmoji} ${visitor.name}` : visitor.name;
	const homeDisplay = homeEmoji ? `${home.name} ${homeEmoji}` : home.name;

	// TODO: Add head-to-head matchup information (season series, recent results, etc.)
	return new EmbedBuilder()
		.setTitle("Game is starting!")
		.setDescription(`${awayDisplay} @ ${homeDisplay}\n\n${venue}`)
		.setColor(0x0099ff)
		.setTimestamp();
};

export function PWHLGoalEmbedBuilder(goal: GoalEvent, gameSummary: GameSummary): EmbedBuilder {
	const { home, visitor, meta, totalShots } = gameSummary;
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
		PeriodShortName,
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
	const scorerName = `${ScorerPlayerFirstName} ${ScorerPlayerLastName} [${ScorerGoalNumber}]`;
	const unassisted = !Assist1PlayerId && !Assist2PlayerId;

	// Determine special goal types
	const specialTypes: string[] = [];
	if (PowerPlay === 1) specialTypes.push("Power play");
	if (ShortHanded === 1) specialTypes.push("Shorthanded");
	if (EmptyNet === 1) specialTypes.push("Empty net");
	if (PenaltyShot === 1) specialTypes.push("Penalty shot");
	const strengthText = specialTypes.length > 0 ? ` - ${specialTypes.join(", ")}` : "";

	// Build description
	let description = isFavoriteTeamGoal ? `### ${scorerName}` : `**${scorerName}**`;
	description += `${unassisted ? " - Unassisted" : ""}${strengthText}`;

	// Add JAILBREAK for shorthanded goals
	if (ShortHanded === 1) {
		description += "\n**Jailbreak**";
	}

	// Build title
	const goalText = isFavoriteTeamGoal ? `goal! ${Strings.REDLIGHT_EMBED}` : "goal";
	const { nickname } = scoringTeam;
	const title = scoringEmoji ? `${scoringEmoji} ${nickname} ${goalText}` : `${nickname} ${goalText}`;

	// Build fields for assists and score
	const fields = [];
	if (Assist1PlayerId) {
		fields.push({
			name: "1st Assist:",
			value: `${Assist1PlayerFirstName} ${Assist1PlayerLastName} [${Assist1PlayerNumAssists}]`,
			inline: false,
		});
	}
	if (Assist2PlayerId) {
		fields.push({
			name: "2nd Assist:",
			value: `${Assist2PlayerFirstName} ${Assist2PlayerLastName} [${Assist2PlayerNumAssists}]`,
			inline: false,
		});
	}

	const awayScore = meta?.visiting_goal_count || "0";
	const homeScore = meta?.home_goal_count || "0";

	const awayShots = totalShots?.visitor ?? "?";
	const homeShots = totalShots?.home ?? "?";

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

	const timestamp = `${Time} ${PeriodShortName}`;

	// Build headshot URL
	const headshotUrl = Paths.PWHL.HeadshotURL(`${ScorerPlayerId}`);

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

	// Get team emoji
	const teamEmoji = EmojiCache.getPWHLTeamEmoji(penaltyTeam.code);

	const playerName = `${PenalizedPlayerFirstName} ${PenalizedPlayerLastName}`;

	const title = teamEmoji ? `${teamEmoji} ${penaltyTeam.nickname} penalty` : `${penaltyTeam.nickname} penalty`;

	// Build description with infraction details
	const infraction = `${OffenceDescription} - ${Minutes} minutes`;

	let description = `**Infraction:**\n${infraction}\n\n**Committed by**\n${playerName}`;

	// Add "Served by" if penalty is served by a different player (e.g., goalie penalties)
	if (ServedPlayerId && ServedPlayerId !== PenalizedPlayerId) {
		description += `\n**Served by:** ${ServedPlayerFirstName} ${ServedPlayerLastName}`;
	}

	const periodName = formatPWHLPeriodName(Period);
	const timeString = `${Time} ${periodName}`;

	// Build headshot URL
	const headshotUrl = PenalizedPlayerId ? Paths.PWHL.HeadshotURL(`${PenalizedPlayerId}`) : undefined;

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setThumbnail(headshotUrl || null)
		.setFooter({ text: timeString })
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
}

export const PWHLPeriodEndEmbedBuilder = (periodNumber: number, gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta, totalShots } = gameSummary;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	const awayScore = meta?.visiting_goal_count || "0";
	const homeScore = meta?.home_goal_count || "0";

	// Get shots if available
	const awayShots = totalShots?.visitor ?? "?";
	const homeShots = totalShots?.home ?? "?";

	const periodName = formatPWHLPeriodName(periodNumber);

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
	const { home, visitor, meta, totalShots } = gameSummary;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	const awayScore = meta?.visiting_goal_count || "0";
	const homeScore = meta?.home_goal_count || "0";

	const awayShots = totalShots?.visitor ?? "?";
	const homeShots = totalShots?.home ?? "?";

	const periodName = formatPWHLPeriodName(periodNumber);

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
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};

export const PWHLGameEndEmbedBuilder = (gameSummary: GameSummary): EmbedBuilder => {
	const { home, visitor, meta, totalShots, status_value } = gameSummary;
	const visitorCode = visitor.code;
	const homeCode = home.code;

	// Get team emojis
	const homeEmoji = EmojiCache.getPWHLTeamEmoji(home.code);
	const awayEmoji = EmojiCache.getPWHLTeamEmoji(visitor.code);

	const awayScore = parseInt(meta?.visiting_goal_count || "0");
	const homeScore = parseInt(meta?.home_goal_count || "0");

	const winningTeam = homeScore > awayScore ? home : visitor;
	const winningEmoji = homeScore > awayScore ? homeEmoji : awayEmoji;

	// Did we win?
	const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
	const weWon = favoriteTeamId && winningTeam.id === favoriteTeamId;

	const winText = weWon ? "WIN!" : "win";

	// Determine if game went to OT/SO
	const finalPeriod = parseInt(meta.period || "3");
	const isShootout = (status_value || "").toUpperCase().includes("SO");
	const isOT = finalPeriod >= 4 && !isShootout;

	let titleSuffix = "";
	if (isShootout) {
		titleSuffix = " (SO)";
	} else if (isOT) {
		titleSuffix = ` (${formatPWHLPeriodName(finalPeriod)})`;
	}

	const title = winningEmoji
		? `${winningEmoji} ${winningTeam.name} ${winText}${titleSuffix}`
		: `${winningTeam.name} ${winText}${titleSuffix}`;

	// Build fields for final score and stats
	const fields = [
		{
			name: awayEmoji ? `${awayEmoji} **${visitorCode}**` : `**${visitorCode}**`,
			value: `Goals: **${awayScore}**\nShots: ${totalShots?.visitor ?? 0}`,
			inline: true,
		},
		{
			name: homeEmoji ? `${homeEmoji} **${homeCode}**` : `**${homeCode}**`,
			value: `Goals: **${homeScore}**\nShots: ${totalShots?.home ?? 0}`,
			inline: true,
		},
	];

	return new EmbedBuilder()
		.setTitle(title)
		.setDescription("**Final Score**")
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED)
		.setTimestamp();
};
