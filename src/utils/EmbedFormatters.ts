import { format, utcToZonedTime } from "date-fns-tz"
import { MessageEmbed } from "discord.js"
import { GameContentResponse } from "../service/models/responses/GameContentResponse"
import { Schedule } from "../service/models/responses/Schedule"
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