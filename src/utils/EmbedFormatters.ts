import { format, utcToZonedTime } from "date-fns-tz"
import { MessageEmbed } from "discord.js"
import { GameContentResponse } from "../service/models/responses/GameContentResponse"
import { GameFeedResponse } from "../service/models/responses/GameFeed"
import { Schedule } from "../service/models/responses/Schedule"
import { Team } from "../service/models/responses/Teams"
import { Kraken } from "./constants"

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

export const CreateGameDayThreadEmbed = (game: Schedule.Game, gamePreview: GameContentResponse.Preview) => {
    const {away, home} = game.teams;
    const isHomeGame = home.team.id == Kraken.TeamId;
    const description = `${isHomeGame ? `VS ${away.team.name}` : `@ ${home.team.name}`} - ${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'PPPPp')}`;
    const preview = gamePreview?.items?.filter(item => item.type == 'article')?.[0];
    return new MessageEmbed()
    .setTitle('Kraken Game Day!')
    .setDescription(description)
    .addField(
        preview ? preview.headline : 'Preview',
        preview ? `${preview.subhead}\n${preview.seoDescription}` : 'No Preview available')
}

export const CreateGoalEmbed = (play: GameFeedResponse.AllPlay, teams: GameFeedResponse.Teams) => {
    const descriptor = play.result.strength.code === 'PPG' ? play.result.strength.name : (play.result.strength.name + ' Strength');
    const title = `${play.team.name} GOAL - ${descriptor}`;
    const description = `${play.result.description}`;
    return new MessageEmbed({
        title,
        description,
        fields: [
            {
                name: 'Current Score',
                value: `${teams.away}: ${play.about.goals.away} - ${teams.home}: ${play.about.goals.home}`,
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