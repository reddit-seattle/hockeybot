import { format, utcToZonedTime } from "date-fns-tz"
import { MessageEmbed } from "discord.js"
import { API } from "../service/API"
import { GameContentResponse } from "../service/models/responses/GameContentResponse"
import { GameFeedResponse } from "../service/models/responses/GameFeed"
import { Schedule } from "../service/models/responses/Schedule"
import { Environment, Kraken, Strings } from "./constants"

const PACIFIC_TIME_ZONE = 'America/Los_Angeles';

export const HomeAtAwayStringFormatter = (teams: Schedule.Teams) => {
    const {home, away} = teams;
    return `${away.team.name} @ ${home.team.name}`
}

export const ScheduledGameFieldFormatter = (game: Schedule.Game) => {
    return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'HH:mm')} - ${game.venue.name}`,
        inline: false
    }
}

export const NextGameFieldFormatter = (game: Schedule.Game) => {
    return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'PPPPp')}`,
        inline: false
    }
}

//TODO: empty net goals show as even strength
export const CreateGameDayThreadEmbed = (game: Schedule.Game, gamePreview: GameContentResponse.Preview) => {
    const {away, home} = game.teams;
    const isHomeGame = home.team.id == Kraken.TeamId;
    const description = `${isHomeGame ? `VS ${away.team.name}` : `@ ${home.team.name}`} - ${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'PPPPp')}`;
    const preview = gamePreview?.items?.filter(item => item.type == 'article')?.[0];
    return new MessageEmbed()
    .setTitle(`${Strings.REDLIGHT_EMBED} ${Environment.DEBUG ?  'Testing Game Day Thread' : 'Kraken Game Day!'} ${Strings.REDLIGHT_EMBED}`)
    .setDescription(description)
    .addField(
        preview ? preview.headline : 'Preview',
        preview ? `${preview.subhead}\n${preview.seoDescription}` : 'No Preview available')
}

export const CreateGoalEmbed = (play: GameFeedResponse.AllPlay, teams: GameFeedResponse.Teams) => {
    //TODO: Get more excited about kraken-specific goals (:redlight: / gifs / etc)
    const descriptor = play.result.strength.code === 'PPG' ? play.result.strength.name : (play.result.strength.name + ' Strength');
    let title = `${play.team.name} GOAL - ${descriptor}`;
    
    if(play.team.id == Kraken.TeamId) {
        title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
    }

    const description = `${play.result.description}`;
    return new MessageEmbed({
        title,
        description,
        fields: [
            {
                name: 'Current Score',
                value: `${teams.away.name}: ${play.about.goals.away} - ${teams.home.name}: ${play.about.goals.home}`,
                inline: false
            },
            {
                name: 'Time Remaining',
                value: `${play.about.periodTimeRemaining} remaining in the ${play.about.ordinalNum} period`,
                inline: false
            }
        ]

    })
}

export const CreateGameResultsEmbed = async (feed: GameFeedResponse.Response) => {
    const { gameData, liveData } = feed;
    const { linescore } = liveData;
    const { away, home } = linescore.teams;
    const homeWin = away.goals < home.goals;
    const winner = homeWin ? home : away;
    const loser = homeWin ? away : home;
    const teamLogo = `https://www-league.nhlstatic.com/images/logos/teams-current-primary-light/${winner.team.id}.svg`
    const krakenWin = (winner.team.id == Kraken.TeamId);
    const title = `${away.team.name} @ ${home.team.name} - ${gameData.status.detailedState}`;
    let description = `${winner.team.name} win${krakenWin ? '!' : '.'}`;

    if(krakenWin) {
        description = `${Strings.REDLIGHT_EMBED} ${description} ${Strings.REDLIGHT_EMBED}`;
    }

    const embed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .addField(
            `${winner.team.name}`,
            `Goals: **${winner.goals}**\n
            Shots: **${winner.shotsOnGoal}**`,
            true
        )
        .addField(
            `${loser.team.name}`,
            `Goals: **${loser.goals}**\n
            Shots: **${loser.shotsOnGoal}**`,
            true
        )
        .setImage(teamLogo);
    
    const start = format(new Date(), "yyyy-MM-dd")
    const season = await API.Seasons.GetCurrentSeason();
    const allGames = await API.Schedule.GetTeamSchedule(Kraken.TeamId, start, season?.seasonEndDate);
    const nextGame = allGames?.[0];
    if(nextGame) {
        const { name, value, inline } = ScheduledGameFieldFormatter(nextGame);
        embed.addField(name, value, inline);
    }

    return embed;
};