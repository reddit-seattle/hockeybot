import {
	EmbedBuilder,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { table } from "table";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Career, Last5Game, PlayerStatsSummary, SubSeason } from "../../service/NHL/models/PlayerStatsSummaryResponse";
import { TeamSummary } from "../../service/NHL/models/TeamSummaryResponse";
import { teamOrPlayerAutocomplete } from "../../utils/autocomplete";
import { PlayerPosition, PlayerStatAbbrev } from "../../utils/enums";
import { requiredPlayerOption, requiredTeamOption } from "../../utils/helpers";

export const GetStats: Command = {
	name: "stats",
	description: "Get stats for a player",
	autocomplete: teamOrPlayerAutocomplete,
	slashCommandDescription: new SlashCommandBuilder()
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("team")
				.setDescription("Get team stats")
				.addStringOption(requiredTeamOption),
		)
		.addSubcommandGroup(
			new SlashCommandSubcommandGroupBuilder()
				.setName("player")
				.setDescription("player stats")
				.addSubcommand(
					new SlashCommandSubcommandBuilder()
						.setName("last5")
						.setDescription("Get player's last 5 games")
						.addStringOption(requiredPlayerOption),
				)
				.addSubcommand(
					new SlashCommandSubcommandBuilder()
						.setName("season")
						.setDescription("Get player's season stats")
						.addStringOption(requiredPlayerOption),
				)
				.addSubcommand(
					new SlashCommandSubcommandBuilder()
						.setName("career")
						.setDescription("Get player's career stats")
						.addStringOption(requiredPlayerOption),
				),
		),
	async executeSlashCommand(interaction) {
		await interaction.deferReply();

		// parse subcommand / group
		const subcommand = interaction.options.getSubcommand(true);
		const subcommandGroup = interaction.options.getSubcommandGroup(false);
		if (subcommandGroup == "player") {
			const player = interaction.options.getString("player", true);
			const playerStats = await API.Stats.GetPlayerStatsSummary(player);
			if (!playerStats) {
				await interaction.followUp({
					content: `Couldn't find stats for player ID ${player}. Tell burn.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			// prepare embed
			let embed = new EmbedBuilder();

			// /stats player last5
			if (subcommand == "last5") {
				embed = await getPlayerLast5StatsEmbed(playerStats);
			} else if (subcommand == "season") {
				// /stats player season
				embed = await getPlayerStatsEmbed(playerStats, false);
			} else if (subcommand == "career") {
				// /stats player career
				embed = await getPlayerStatsEmbed(playerStats, true);
			}

			embed && (await interaction.followUp({ embeds: [embed] }));
		} else if (!subcommandGroup && subcommand == "team") {
			const team = interaction.options.getString("team", true);
			const summary = await API.Teams.GetTeamSummary(team);
			const embed = buildTeamStatsSummaryEmbed(summary);
			embed && (await interaction.followUp({ embeds: [embed] }));
		}
	},
};

/**
 * Gets an embed for a player's season stat summary
 * @param playerStats Regular season stats object
 * @param career Whether this is career stats (slightly more data) or just season stats
 * @returns embed with all stats as inline fields
 */
const getPlayerStatsEmbed = async (playerStats: PlayerStatsSummary, career?: boolean) => {
	const {
		firstName,
		lastName,
		sweaterNumber,
		fullTeamName,
		position,
		headshot,
		heightInInches,
		weightInPounds,
		shootsCatches,
		featuredStats,
	} = playerStats;

	const statType = `${career ? "Career" : "Regular Season"} Stats`;
	const title = `${firstName.default} ${lastName.default} ${statType}`;
	const image = headshot;

	const isGoalie = position == PlayerPosition.goalie;
	const shootsCatchesDesc = isGoalie ? `Catches` : `Shoots`;
	const statLine = `Height: ${heightInInches} in, weight: ${weightInPounds} lbs`;

	const descriptionItems = [
		`**#${sweaterNumber}** ${fullTeamName.default}`,
		`Position:  ${position}, ${shootsCatchesDesc} ${shootsCatches}`,
		`${statLine}`,
	];

	if (career) {
		// insert bio
		const { birthDate, birthCity, birthCountry } = playerStats;
		const bio = `Born ${birthDate}, ${birthCity.default} ${birthCountry}`;
		descriptionItems.splice(2, 0, bio);
	}
	const description = descriptionItems.join("\n");

	const { regularSeason: stats } = featuredStats;

	// not sure why, but using a ternary for assignment causes the wrong type inference
	let seasonStats: SubSeason | Career;
	if (career) {
		seasonStats = stats.career;
	} else {
		seasonStats = stats.subSeason;
	}
	const fields = getStatsEmbedFields(seasonStats, isGoalie);

	return new EmbedBuilder().setTitle(title).setDescription(description).setThumbnail(image).addFields(fields);
};

const getPlayerLast5StatsEmbed = async (playerStats: PlayerStatsSummary) => {
	const {
		firstName,
		lastName, // Philipp Grubauer
		sweaterNumber,
		fullTeamName,
		position,
		headshot,
		heightInInches,
		weightInPounds,
		shootsCatches,
		last5Games,
	} = playerStats;

	const isGoalie = position == PlayerPosition.goalie;

	const title = `${firstName.default} ${lastName.default}`;
	const image = headshot;
	const shootsCatchesDesc = isGoalie ? `Catches` : `Shoots`;
	const statLine = `Height: ${heightInInches} in, weight: ${weightInPounds} lbs`;
	const description = [
		`**#${sweaterNumber}** ${fullTeamName.default}`,
		`Position:  ${position}, ${shootsCatchesDesc} ${shootsCatches}`,
		`${statLine}`,
	].join("\n");

	// TODO - check formatting on mobile
	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setThumbnail(image)
		.addFields([
			{
				name: "Last 5 games",
				value: "```\n" + lastFiveTableFormatter(last5Games, isGoalie) + "\n```",
			},
		]);
};

const getStatsEmbedFields = (stats: SubSeason | Career, goalie?: boolean) => {
	if (goalie) {
		const { gamesPlayed, wins, losses, otLosses, shutouts, goalsAgainstAvg, savePctg } = stats;
		return [
			[`${gamesPlayed}`, PlayerStatAbbrev.gamesPlayed],
			[`${wins}`, PlayerStatAbbrev.wins],
			[`${losses}`, PlayerStatAbbrev.losses],
			[`${otLosses}`, PlayerStatAbbrev.overtimeLosses],
			[`${shutouts}`, PlayerStatAbbrev.shutouts],
			[`${(goalsAgainstAvg || 0).toFixed(3)}`, PlayerStatAbbrev.goalsAgainstAvg],
			[`${(savePctg || 0).toFixed(3)}`, PlayerStatAbbrev.savePctg],
		].map((vals: any[]) => {
			return {
				name: vals[1],
				value: vals[0],
				inline: true,
			};
		});
	}
	const {
		gamesPlayed,
		goals,
		assists,
		points, // regular game stats
		plusMinus,
		pim,
		shots,
		shootingPctg, // team stats
		gameWinningGoals,
		otGoals,
		powerPlayGoals,
		powerPlayPoints,
		shorthandedGoals,
		shorthandedPoints, // hero stats
	} = stats;
	return [
		[`${gamesPlayed}`, PlayerStatAbbrev.gamesPlayed],
		[`${points}`, PlayerStatAbbrev.points],
		[`${goals}`, PlayerStatAbbrev.goals],
		[`${assists}`, PlayerStatAbbrev.assists],
		[`${shots}`, PlayerStatAbbrev.shots],
		[`${shootingPctg?.toFixed(2)}`, PlayerStatAbbrev.shootingPctg],
		[`${plusMinus}`, PlayerStatAbbrev.plusMinus],
		[`${pim}`, PlayerStatAbbrev.penaltyMinutes],
		[`${gameWinningGoals}`, PlayerStatAbbrev.gameWinningGoals],
		[`${otGoals}`, PlayerStatAbbrev.overtimeGoals],
		[`${powerPlayPoints}`, PlayerStatAbbrev.powerPlayPoints],
		[`${powerPlayGoals}`, PlayerStatAbbrev.powerPlayGoals],
		[`${shorthandedPoints}`, PlayerStatAbbrev.shortHandedPoints],
		[`${shorthandedGoals}`, PlayerStatAbbrev.shortHandedGoals],
	].map((vals: string[]) => {
		return {
			name: vals[1],
			value: vals[0],
			inline: true,
		};
	});
};

const lastFiveTableFormatter = (games: Last5Game[], goalie?: boolean) => {
	const goalieHeaders = [
		`VS`,
		`${PlayerStatAbbrev.decision}`,
		`${PlayerStatAbbrev.saves}`,
		`${PlayerStatAbbrev.savePctg}`,
		`${PlayerStatAbbrev.goalsAgainst}`,
	];
	const skaterHeaders = [
		`VS`,
		`${PlayerStatAbbrev.points}`,
		`${PlayerStatAbbrev.goals}`,
		`${PlayerStatAbbrev.assists}`,
		`${PlayerStatAbbrev.shots}`,
		`${PlayerStatAbbrev.plusMinus}`,
		`${PlayerStatAbbrev.penaltyMinutes}`,
	];

	return table([
		goalie ? goalieHeaders : skaterHeaders,
		...games.map((game: Last5Game) => {
			return createLast5TableRow(game, goalie);
		}),
	]);
};

const createLast5TableRow = (game: Last5Game, goalie?: boolean) => {
	const { opponentAbbrev } = game;

	if (goalie) {
		const { decision, shotsAgainst, goalsAgainst, savePctg } = game;

		return [
			`${opponentAbbrev}`,
			`${decision ?? ""}`,
			`${(shotsAgainst ?? 0) - (goalsAgainst ?? 0)}`,
			`${(savePctg || 0)?.toFixed(3)}`,
			`${goalsAgainst ?? 0}`,
		];
	}

	const { goals, assists, points, plusMinus, shots, pim } = game;

	return [
		`${opponentAbbrev}`,
		`${points ?? 0}`,
		`${goals ?? 0}`,
		`${assists ?? 0}`,
		`${shots ?? 0}`,
		`${plusMinus ?? 0}`,
		`${pim ?? 0}`,
	];
};
const buildTeamStatsSummaryEmbed = (summary: TeamSummary) => {
	const {
		faceoffWinPct,
		gamesPlayed,
		goalsAgainst,
		goalsAgainstPerGame,
		goalsFor,
		goalsForPerGame,
		losses,
		otLosses,
		penaltyKillPct,
		// pointPct,
		points,
		powerPlayPct,
		regulationAndOtWins,
		shotsAgainstPerGame,
		shotsForPerGame,
		teamFullName,
		wins,
		winsInRegulation,
		winsInShootout,
	} = summary;

	const title = `${teamFullName} Season Stats`;

	const mainStatFields = [
		[PlayerStatAbbrev.gamesPlayed, `${gamesPlayed ?? 0}`],
		[PlayerStatAbbrev.points, `${points ?? 0}`],
		[PlayerStatAbbrev.wins, `${wins ?? 0}`],
		[PlayerStatAbbrev.losses, `${losses ?? 0}`],
		[PlayerStatAbbrev.overtimeLosses, `${otLosses ?? 0}`],
		["RW", `${winsInRegulation ?? 0}`],
		["ROW", `${regulationAndOtWins ?? 0}`],
		["SOW", `${winsInShootout ?? 0}`],
	].map((val: string[]) => {
		return {
			name: val[0],
			value: val[1],
			inline: true,
		};
	});

	const goalDiff = goalsFor - goalsAgainst;
	const secondaryStatFields = [
		// goals
		["GF", `${goalsFor ?? 0}`],
		[PlayerStatAbbrev.goalsAgainst, `${goalsAgainst ?? 0}`],
		["GDIFF", `${goalDiff ?? 0}`],
		[PlayerStatAbbrev.goalsForPerGamesPlayed, `${(goalsForPerGame ?? 0).toFixed(2)}`],
		[PlayerStatAbbrev.goalsAgainstPerGamesPlayed, `${(goalsAgainstPerGame ?? 0).toFixed(2)}`],
		// shots
		[`SF/GP`, `${(shotsForPerGame ?? 0).toFixed(2)}`],
		[`SA/GP`, `${(shotsAgainstPerGame ?? 0).toFixed(2)}`],
		//special teams
		[PlayerStatAbbrev.faceoffPctg, `${(faceoffWinPct ?? 0).toFixed(2)}`],
		[PlayerStatAbbrev.powerPlayPercentage, `${(powerPlayPct ?? 0).toFixed(2)}`],
		[`PK%`, `${(penaltyKillPct ?? 0).toFixed(2)}`],
	].map((val: string[]) => {
		return {
			name: val[0],
			value: val[1],
			inline: true,
		};
	});

	return new EmbedBuilder().setTitle(title).addFields(...mainStatFields, ...secondaryStatFields);
};
