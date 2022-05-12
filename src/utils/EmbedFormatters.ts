import { format, utcToZonedTime } from "date-fns-tz"
import { EmbedFieldData, Message, MessageEmbed } from "discord.js"
import { first } from "underscore"
import { API } from "../service/API"
import { GameContentResponse } from "../service/models/responses/GameContentResponse"
import { GameFeedResponse } from "../service/models/responses/GameFeed"
import { ScheduleResponse } from "../service/models/responses/Schedule"
import { Environment, GameTypes, Kraken, Paths, Strings } from "./constants"

const PACIFIC_TIME_ZONE = 'America/Los_Angeles';

export const HomeAtAwayStringFormatter = (teams: ScheduleResponse.Teams) => {
    const {home, away} = teams;
    return `${away.team.name} @ ${home.team.name}`
};

export const ScheduledGameFieldFormatter = (game: ScheduleResponse.Game) => {
  // add playoff info
  let gameInfo = `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'HH:mm')} - ${game.venue.name}`;
  switch(game.gameType) {
    case GameTypes.PLAYOFFS:
      if(game.seriesSummary) {
        gameInfo += `\n${game.seriesSummary.seriesStatusShort}`
      }
      break;
    default: break;
  }  
  
  return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: gameInfo,
        inline: false
    }
};

export const NextGameFieldFormatter = (game: ScheduleResponse.Game) => {
    return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), 'PPPPp')}`,
        inline: false
    }
};

export const CreateGameDayThreadEmbed = (game: ScheduleResponse.Game, gamePreview: GameContentResponse.Preview) => {
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

//TODO: empty net goals show as even strength
export const CreateGoalEmbed = (play: GameFeedResponse.AllPlay, teams: GameFeedResponse.Teams) => {
    //TODO: Get more excited about kraken-specific goals (:redlight: / gifs / etc)
    const descriptor = play?.result?.strength?.code === 'PPG' ? play.result.strength.name : (play?.result?.strength?.name + ' Strength');
    let title = `${play?.team?.name} GOAL - ${descriptor}`;
    
    if(play?.team?.id == Kraken.TeamId) {
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
};

export const CreateGameResultsEmbed = async (feed: GameFeedResponse.Response) => {
    const { gameData, liveData } = feed;
    const { linescore } = liveData;
    const { away, home } = linescore.teams;
    const homeWin = away.goals < home.goals;
    const winner = homeWin ? home : away;
    const loser = homeWin ? away : home;
    const teamLogo = Paths.TeamLogo(winner.team.id);
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
            `Goals: **${winner.goals}**\nShots: **${winner.shotsOnGoal}**`,
            true
        )
        .addField(
            `${loser.team.name}`,
            `Goals: **${loser.goals}**\nShots: **${loser.shotsOnGoal}**`,
            true
        )
        .setThumbnail(teamLogo);
    
    const start = format(new Date(), "yyyy-MM-dd")
    const season = await API.Seasons.GetCurrentSeason();
    const allGames = await API.Schedule.GetTeamSchedule(Kraken.TeamId, start, season?.seasonEndDate);
    const nextGame = allGames?.[0];
    if(nextGame) {
        const { name, value, inline } = ScheduledGameFieldFormatter(nextGame);
        embed.addField(
          `**Next Game**: ${HomeAtAwayStringFormatter(nextGame.teams)}`,
          `${format(utcToZonedTime(nextGame.gameDate, PACIFIC_TIME_ZONE), 'PPPPpppp')} - ${nextGame.venue.name}`,
          inline
        );
    }

    return embed;
};

export const createShootoutEmbed = (
  play: GameFeedResponse.AllPlay,
  shootoutPlays: GameFeedResponse.AllPlay[],
  teams: GameFeedResponse.LineScoreTeams
) => {
    
    // only grab shootout plays up until this play
  shootoutPlays = shootoutPlays.filter(
    x => new Date(x.about.dateTime) <= new Date(play.about.dateTime)
  );

  const { result, team } = play;
  const { description, eventTypeId } = result;
  let title = `${team?.name} - ${eventTypeId}`;
  const thumbnail = team ? Paths.TeamLogo(team?.id) : undefined;
  const goal = eventTypeId === "GOAL";
  const kraken = team?.id === Kraken.TeamId;
  if (goal && kraken) {
    title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
  }

  if (!shootoutPlays?.[0]) {
    return;
  }
  const shootFirst = shootoutPlays[0].team?.triCode ?? "N/A";
  const shootSecond =
    teams.away.team.triCode == shootFirst
      ? teams.home.team.triCode
      : teams.away.team.triCode;

  const shootoutResults: {
    [abbr: string]: {
      result: string;
      player: string;
    }[];
  } = {};

  shootoutResults[shootFirst] = [];
  shootoutResults[shootSecond] = [];
  shootoutPlays.forEach((soPlay) => {
    const shooter = soPlay.players?.filter(
      (p) => p.playerType != "Goalie"
    )?.[0];
    shootoutResults[soPlay.team?.triCode ?? "N/A"].push({
      result: shootoutSymbol(soPlay),
      player: shooter?.player.fullName ?? "Unknown",
    });
  });

  const embed = new MessageEmbed({
    title,
    description,
    thumbnail: { url: thumbnail, width: 50 },
    fields: [shootFirst, shootSecond].map((item) => {
      return {
        name: `**${item}**`,
        value:
          shootoutResults[item]
            .map((obj) => {
              return `${obj.result} ${obj.player}`;
            })
            .join("\n") || Strings.ZERO_WIDTH_SPACE,
        inline: true,
      };
    }),
  });

  return embed;
};

const shootoutSymbol = (play: GameFeedResponse.AllPlay | undefined) => {
  if (!play) {
    return Strings.ZERO_WIDTH_SPACE;
  }
  return play.result.eventTypeId == "GOAL" ? "🚨" : "✖";
};