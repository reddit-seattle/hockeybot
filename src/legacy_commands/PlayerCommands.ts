import { Message, EmbedBuilder, TextChannel } from "discord.js";
import { extract, partial_ratio } from "fuzzball";
import { API } from "../service/legacy_API";
import { Roster } from "../service/models/legacy_responses/Roster";
import { getProperty } from "../utils/helpers";

const oldCommand = async (message: Message, args?: string[]) => {
    if(!args?.[0]) {
        (message.channel as TextChannel).send(`I need a team abbreviation, buddy`);
    }
    const team = await API.Teams.GetTeamByAbbreviation(args?.[0]);
    if(!team?.id) {
        (message.channel as TextChannel).send(`Couldn't find roster for team ${args?.[0]}`);
        return;
    }
    const players = await API.Teams.GetRoster(team.id);

    const playerArg = args?.[1];
    if (!playerArg) {
        (message.channel as TextChannel).send('No player search info provided. Please provide the team and either a name or jersey number.');
        return;
    }
    const playerNum = parseInt(playerArg); // may be NaN
    //let's get weird and try and pull a player out with whatever the second arg is

    let player: Roster.Player | undefined = undefined;
    if(isNaN(playerNum)){
        player = extract(playerArg.toLowerCase(), players, {
            scorer: partial_ratio,
            processor: (player: Roster.Player) => player?.person?.fullName.toLowerCase(),
            limit: 1,
            cutoff: 50,
            returnObjects: true
        })?.[0]?.choice as Roster.Player;
    }
    else {
        player = players.find(player => parseInt(player.jerseyNumber) == playerNum );
    }
    if(player) {
        const playerStats = await API.Players.GetPlayerSeasonStats(player.person.id);
        if(playerStats) {
            //try and get player image
            const playerImageUrl = `https://cms.nhl.bamgrid.com/images/headshots/current/168x168/${player.person.id}.jpg`
            const embed = new EmbedBuilder({
                title: `${player.person.fullName} - ${team.abbreviation} ${player.jerseyNumber}`,
                description: 'Season stats',
                color: 111111,
                image: {
                    url: playerImageUrl
                },
                fields: Object.keys(playerStats).map((key: any) => {
                    return {
                        name: key,
                        value: `${getProperty(playerStats, key) || 'N/A'}`,
                        inline: true
                    }
                })
            });
            (message.channel as TextChannel).send({embeds: [embed]});
        }
        else {
            (message.channel as TextChannel).send(`error finding a match (or statistics) for '${playerArg}'`);
        }
    }
    else { 

        (message.channel as TextChannel).send(`No player found on the ${team.teamName} with name or number matching ${playerArg}`)

    }
}