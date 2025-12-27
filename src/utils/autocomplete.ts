import { AutocompleteInteraction } from "discord.js";
import { first } from "underscore";
import { API as MLBAPI } from "../service/MLB/API";
import { API as NHLAPI } from "../service/NHL/API";
import { API as PWHLAPI } from "../service/PWHL/API";
import { TeamTriCode } from "./enums";
import { localizedTimeString } from "./helpers";
import { Logger } from "./Logger";

/**
 * Autocomplete for NHL team or player options
 */
export const teamOrPlayerAutocomplete = async (interaction: AutocompleteInteraction) => {
	const value = interaction.options.getFocused(true);
	if (value.name == "team") {
		const choices = Object.keys(TeamTriCode);
		const filtered = choices.filter((choice) => choice.toUpperCase().startsWith(value.value.toUpperCase()));
		await interaction.respond(
			first(
				filtered.map((choice) => ({ name: choice, value: choice })),
				25,
			),
		);
		return;
	}
	if (value.name == "player") {
		const choices = await NHLAPI.Search.Player(value.value);
		await interaction.respond(
			choices
				? first(
						choices.map((choice) => ({
							name: `${choice.name} [${choice.teamAbbrev}]`,
							value: choice.playerId,
						})),
						25,
					)
				: [],
		);
		return;
	}
};

/**
 * Autocomplete for active NHL games
 */
export const activeGameAutocomplete = async (interaction: AutocompleteInteraction) => {
	try {
		const focusedValue = interaction.options.getFocused();

		// Get today's schedule
		const games = await NHLAPI.Schedule.GetDailySchedule();

		if (!games || games.length === 0) {
			await interaction.respond([]);
			return;
		}

		// Format games as "AWAY @ HOME" with game ID as value
		const choices = games.map((game) => ({
			name: `${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev}`,
			value: game.id.toString(),
		}));

		// Filter based on user input
		const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));

		// Discord allows max 25 autocomplete options
		await interaction.respond(filtered.slice(0, 25));
	} catch (error) {
		Logger.error("Error fetching games for autocomplete:", error);
		await interaction.respond([]);
	}
};

/**
 * Autocomplete for MLB games
 */
export const mlbGameAutocomplete = async (interaction: AutocompleteInteraction) => {
	try {
		const games = await MLBAPI.Schedule.Today();

		if (!games || games.length === 0) {
			await interaction.respond([]);
			return;
		}

		const choices = games.map((game) => {
			const { teams } = game;
			const gameDate = new Date(game.gameDate);
			const timeStr = localizedTimeString(gameDate);
			return {
				name: `${teams.away.team.name} @ ${teams.home.team.name} - ${timeStr}`,
				value: game.gamePk.toString(),
			};
		});

		await interaction.respond(choices);
	} catch (error) {
		Logger.error("Error in MLB game autocomplete:", error);
		await interaction.respond([]);
	}
};

/**
 * Autocomplete for PWHL games
 */
export const pwhlGameAutocomplete = async (interaction: AutocompleteInteraction) => {
	try {
		const focusedValue = interaction.options.getFocused();
		const games = await PWHLAPI.Schedule.GetScorebar(1, 1);
		if (!games || games.length === 0) {
			await interaction.respond([]);
			return;
		}

		const choices = games.map((game) => ({
			name: `${game.VisitorCode} @ ${game.HomeCode}`,
			value: game.ID,
		}));

		// Filter based on user input
		const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));

		// Discord allows max 25 autocomplete options
		await interaction.respond(filtered.slice(0, 25));
	} catch (error) {
		Logger.error("Error fetching PWHL games for autocomplete:", error);
		await interaction.respond([]);
	}
};

/**
 * Autocomplete for PWHL teams
 */
export const pwhlTeamAutocomplete = async (interaction: AutocompleteInteraction) => {
	try {
		const focusedValue = interaction.options.getFocused();
		const teams = await PWHLAPI.Teams.GetTeamsBySeason();
		const choices = teams.map((team) => ({
			name: `${team.nickname} (${team.code})`,
			value: team.code,
		}));
		const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
		await interaction.respond(filtered.slice(0, 25));
	} catch (error) {
		Logger.error("Error fetching teams for autocomplete:", error);
		await interaction.respond([]);
	}
};

/**
 * Autocomplete for debug-replayable PWHL games
 */
export const pwhlReplayGameAutocomplete = async (interaction: AutocompleteInteraction) => {
	try {
		const focusedValue = interaction.options.getFocused();

		// Get available game IDs and fetch game metadata
		const [liveData, games] = await Promise.all([
			PWHLAPI.Live.GetAllLiveData(),
			PWHLAPI.Schedule.GetScorebar(60, 0),
		]);

		const availableGameIds = Object.keys(liveData?.goals?.[1]?.games || {});
		if (availableGameIds.length === 0 || !games) {
			await interaction.respond([]);
			return;
		}

		// Filter and map in one pass
		const choices = games
			// Only include games with live data
			.filter((game) => availableGameIds.includes(game.ID))
			// format for autocomplete
			.map((game) => ({
				name: `${game.VisitorCode} ${game.VisitorGoals} @ ${game.HomeCode} ${game.HomeGoals} (${new Date(game.GameDateISO8601).toLocaleDateString()})`,
				value: game.ID,
			}))
			// filter based on user input
			.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()))
			// limit to 25 results
			.slice(0, 25);

		await interaction.respond(choices);
	} catch (error) {
		Logger.error("Error fetching PWHL replay games for autocomplete:", error);
		await interaction.respond([]);
	}
};
