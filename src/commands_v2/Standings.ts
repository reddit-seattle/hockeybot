import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API_v2";
import { teamNameAutocomplete, validTeamName } from "../utils/helpers";
import { ConferenceAbbrev, DivisionAbbrev } from "../utils/enums";
import { Standing } from "../service/models/responses_v2/DefaultStandingsResponse";
import { EmbedBuilder } from "@discordjs/builders";
import _ from "underscore";

export const GetRecord: Command = {
    name: 'teamrecordv2',
    description: 'Get Team record info',
    autocomplete: teamNameAutocomplete,
    slashCommandDescription: new SlashCommandBuilder()
        .addStringOption((option) =>
            option
            .setName("team")
            .setDescription("Team abbreviation (SEA)")
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async executeSlashCommand(interaction) {
        const team = interaction.options.getString("team", true);
        if( !validTeamName(team)) {
            await interaction.reply({ content: "That's not a team, buddy", ephemeral: true });
            return;
        }
        await interaction.deferReply();
        const standings = await API.Standings.GetStandings();
        const teamStanding = standings.find(standing => standing.teamAbbrev.default == team);
        if(!teamStanding) {
            interaction.followUp(`Couldn't find standings for ${team}`);
            return;
        }
        const {
            teamLogo,
            gamesPlayed, points,
            conferenceSequence, conferenceName, // []st/nd/rd/th in the [] Conference
            divisionSequence, divisionName, // []st/nd/rd/th in the [] division
            leagueSequence, // Xth in the League
            wins, losses, otLosses, // (W-L-OTL)
            streakCode, streakCount, // W2
            l10Wins, l10Losses, l10OtLosses, // (L10)
        } = teamStanding;
        const recordDescriptor = `Record: (${wins}-${losses}-${otLosses})`;
        const pointsDescriptor = `Points: ${points} (${gamesPlayed} games)`;
        const leagueDescriptor = `League standing: ${getOrdinalPlace(leagueSequence)} place`
        const confDescriptor = `${getOrdinalPlace(conferenceSequence)} in the ${conferenceName} conference`
        const divDescriptor = `${getOrdinalPlace(divisionSequence)} in the ${divisionName} division`
        const lastTenDescriptor = `Last 10 games: ${l10Wins}-${l10Losses}-${l10OtLosses} (Streak ${streakCount}${streakCode})`

        // TODO - this isn't quite right/done
        await interaction.followUp({embeds: [
            new EmbedBuilder()
                .setTitle(`${teamStanding.teamCommonName.default} Standings`)
                .setImage(teamLogo)
                .setThumbnail(teamLogo)
                .addFields([
                    {
                        name: `${recordDescriptor}`,
                        value: `
                            ${pointsDescriptor}
                            ${leagueDescriptor}
                            ${confDescriptor}
                            ${divDescriptor}
                            ${lastTenDescriptor}
                        `
                    }
                ])
        ]})
    }
}
/**
 * Standings
 * By League, Conference, Division, wildcard
 */
export const GetStandings: Command = {
    name: 'standingsv2',
    description: 'Get NHL Standings',
    slashCommandDescription: new SlashCommandBuilder()
        .addSubcommand(cmd =>
            cmd
                .setName('division')
                .setDescription('Division Standings')
                .addStringOption(option =>
                    option
                        .setName("division")
                        .setDescription("Which division")
                        .setRequired(true)
                        .addChoices(
                            {name: "Atlantic", value: DivisionAbbrev.atlantic},
                            {name: "Central", value: DivisionAbbrev.central},
                            {name: "Metro", value: DivisionAbbrev.metro},
                            {name: "Pacific", value: DivisionAbbrev.pacific},
                        )
                )
        )
        .addSubcommand(cmd =>
            cmd
                .setName('conference')
                .setDescription('Conference Standings')
                .addStringOption(option =>
                    option
                        .setName("conference")
                        .setDescription("Which conference")
                        .setRequired(true)
                        .addChoices(
                            {name: "Western", value: ConferenceAbbrev.western},
                            {name: "Eastern", value: ConferenceAbbrev.eastern},
                        )
                ),
        )
        // .addSubcommand(cmd =>
        //     cmd
        //         .setName('league')
        //         .setDescription('League Standings')
        // )
        .addSubcommand(cmd =>
            cmd
                .setName('wildcard')
                .setDescription('Wildcard Standings')
        ),

    async executeSlashCommand(interaction) {
        await interaction.deferReply();
        const standings = await API.Standings.GetStandings();
        const subcommand = interaction.options.getSubcommand(true);
        // if(subcommand == 'league') {
        //     // all standings
        // }
        if(subcommand == 'conference') {
            // standings by single conference
            const conference = interaction.options.getString("conference", true);
            const sortedStandings = standings
                .filter(standing => standing.conferenceAbbrev == conference)
                .sort(standing => standing.conferenceSequence)
            
            const title = `${conference === 'E' ? 'Eastern' : 'Western'} conference standings`
            const fields = sortedStandings.map((standing, idx) => {
                const { teamAbbrev, teamName } = standing;
                const teamDescriptor = `${idx+1}: [${teamAbbrev.default}] ${teamName.default}`;
                return {
                    name: teamDescriptor,
                    value: buildTeamStandingString(standing)
                }
            });
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(title)
                        .addFields(fields)
                ]
            });

        }
        else if(subcommand == 'division') {
            // standings by single division
            const division = interaction.options.getString("division", true);
            const sortedStandings = standings
                .filter(standing => standing.divisionAbbrev == division)
                .sort(standing => standing.divisionSequence)
            const div = standings[0].divisionName;
            const title = `${div} division standings`
            const fields = sortedStandings.map((standing, idx) => {
                const { teamAbbrev, teamName } = standing;
                const teamDescriptor = `${idx+1}: [${teamAbbrev.default}] ${teamName.default}`;
                return {
                    name: teamDescriptor,
                    value: buildTeamStandingString(standing)
                }
            });
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(title)
                        .addFields(fields)
                ]
            })
            
            
        }       
        else if(subcommand == 'wildcard') {
            const eastern = standings
                .filter(standing => standing.conferenceAbbrev == ConferenceAbbrev.eastern )
                .sort(wildcardSort);
            
            const western = standings
                .filter(standing => standing.conferenceAbbrev == ConferenceAbbrev.western)
                .sort(wildcardSort);
            
            const easternPlayoffs = _.first(eastern, 8);
            const westernPlayoffs = _.first(western, 8);

            const eastWildcardRace = eastern.filter(standing => standing.wildcardSequence > 2)
            const westWildcardRace = western.filter(standing => standing.wildcardSequence > 2)

            const title = "Wildcard standings"
            const fields = [
                {
                    name: 'Eastern Playoffs',
                    value: easternPlayoffs.map((standing, idx) => {
                        const pos = idx > 5 ? `WC${idx-5}` : idx+1;
                        return `${pos}: ${buildWildcardString(standing)}`
                    }).join('\n')
                },
                {
                    name: 'Eastern Wildcard',
                    value: eastWildcardRace.map((standing) => {
                        return `${buildWildcardString(standing)}`
                    }).join('\n')
                },
                {
                    name: 'Western Playoffs',
                    value: westernPlayoffs.map((standing, idx) => {
                        const pos = idx > 5 ? `WC${idx-5}` : idx+1;
                        return `${pos}: ${buildWildcardString(standing)}`
                    }).join('\n')
                },
                {
                    name: 'Western Wildcard',
                    value: westWildcardRace.map((standing) => {
                        return `${buildWildcardString(standing)}`
                    }).join('\n')
                },
            ];

            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(title)
                        .addFields(fields)
                ]
            })
            
        }
    }
}

const wildcardSort = (a: Standing, b: Standing) => {
    return a.conferenceSequence - b.conferenceSequence || a.wildcardSequence - b.wildcardSequence
}

const buildWildcardString = (standing: Standing) => {
    const {
        teamAbbrev, teamName,
        points, // (82 pts [.500])
        gamesPlayed,
        divisionAbbrev,
        divisionSequence
    } = standing;

    const teamDescriptor = `${teamAbbrev.default}`;
    const divisionDescriptor = `(${divisionAbbrev}${divisionSequence})`;
    return `${teamDescriptor} - ${points} pts - ${gamesPlayed} GP - ${divisionDescriptor}`


}

const buildTeamStandingString = (standing: Standing) => {
    const {
        points, pointPctg, // (82 pts [.500])
        wins, losses, otLosses, // (W-L-OTL)
        streakCode, streakCount, // W2
        l10Wins, l10Losses, l10OtLosses, // (L10)
    } = standing;
    

    const pointsDescriptor = `${points} pts`;
    const record = `(${wins}-${losses}-${otLosses})`;
    const l10 = `(${l10Wins}-${l10Losses}-${l10OtLosses})`
    const streak = `${streakCount}${streakCode}`

    return `${pointsDescriptor} - ${record} - L10: ${l10} - streak ${streak}`;
}

const getOrdinalPlace = (int: number) => {
    int = Math.round(int);
	let numString = int.toString();

	if (Math.floor(int / 10) % 10 === 1) {
		return `${numString}th`;
	}

	switch (int % 10) {
		case 1: return `${numString}st`;
		case 2: return `${numString}nd`;
		case 3: return `${numString}rd`;
		default: return `${numString}th`;
	}
}
