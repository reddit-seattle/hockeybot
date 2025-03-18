import { format, utcToZonedTime } from "date-fns-tz";
import { Embed, EmbedBuilder, MessageEditOptions } from "discord.js";
import { contains } from "underscore";
import { API } from "../service/legacy_API";
import { GameContentResponse } from "../service/models/legacy_responses/GameContentResponse";
import { GameFeedResponse } from "../service/models/legacy_responses/GameFeed";
import { PlayoffStandings } from "../service/models/legacy_responses/PlayoffStandings";
import { ScheduleResponse } from "../service/models/legacy_responses/Schedule";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { Environment, GameTypes, Kraken, Legacy_Paths, Strings } from "./constants";
import { EventTypeCode } from "./enums";
import { getSituationCodeString, periodToStr } from "./helpers";

const PACIFIC_TIME_ZONE = "America/Los_Angeles";

export const HomeAtAwayStringFormatter = (teams: ScheduleResponse.Teams) => {
    const { home, away } = teams;
    return `${away.team.name} @ ${home.team.name}`;
};

export const ScheduledGameFieldFormatter = (game: ScheduleResponse.Game) => {
    // add playoff info
    let gameInfo = `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), "HH:mm")} - ${game.venue.name}`;
    switch (game.gameType) {
        case GameTypes.PLAYOFFS:
            if (game.seriesSummary) {
                gameInfo += `\n${game.seriesSummary.seriesStatusShort}`;
            }
            break;
        default:
            break;
    }

    return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: gameInfo,
        inline: false,
    };
};

export const NextGameFieldFormatter = (game: ScheduleResponse.Game) => {
    return {
        name: HomeAtAwayStringFormatter(game.teams),
        value: `${format(utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE), "PPPPp")}`,
        inline: false,
    };
};

export const CreateGameDayThreadEmbed = (game: ScheduleResponse.Game, gamePreview: GameContentResponse.Preview) => {
    const { away, home } = game.teams;
    const isHomeGame = home.team.id == Kraken.TeamId;
    const description = `${isHomeGame ? `VS ${away.team.name}` : `@ ${home.team.name}`} - ${format(
        utcToZonedTime(game.gameDate, PACIFIC_TIME_ZONE),
        "PPPPp"
    )}`;
    const preview = gamePreview?.items?.filter((item) => item.type == "article")?.[0];
    return new EmbedBuilder()
        .setTitle(
            `${Strings.REDLIGHT_EMBED} ${Environment.DEBUG ? "Testing Game Day Thread" : "Kraken Game Day!"} ${
                Strings.REDLIGHT_EMBED
            }`
        )
        .setDescription(description)
        .addFields([
            {
                name: preview ? preview.headline : "Preview",
                value: preview ? `${preview.subhead}\n${preview.seoDescription}` : "No Preview available",
            },
        ]);
};

export const CreateGoalEmbed = (play: GameFeedResponse.AllPlay, teams: GameFeedResponse.Teams) => {
    const descriptor =
        play?.result?.strength?.code === "PPG" ? play.result.strength.name : play?.result?.strength?.name + " Strength";
    let title = `${play?.team?.name} GOAL - ${descriptor}`;

    if (play?.team?.id == Kraken.TeamId) {
        title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
    }

    const description = `${play.result.description}`;
    return new EmbedBuilder({
        title,
        description,
        fields: [
            {
                name: "Current Score",
                value: `${teams.away.name}: ${play.about.goals.away} - ${teams.home.name}: ${play.about.goals.home}`,
                inline: false,
            },
            {
                name: "Time Remaining",
                value: `${play.about.periodTimeRemaining} remaining in the ${play.about.ordinalNum} period`,
                inline: false,
            },
        ],
    });
};

export const CreateGameResultsEmbed = async (feed: GameFeedResponse.Response) => {
    const { gameData, liveData } = feed;
    const { linescore } = liveData;
    const { away, home } = linescore.teams;
    const homeWin = away.goals < home.goals;
    const winner = homeWin ? home : away;
    const loser = homeWin ? away : home;
    const teamLogo = Legacy_Paths.TeamLogo(winner.team.id);
    const krakenWin = winner.team.id == Kraken.TeamId;
    const title = `${away.team.name} @ ${home.team.name} - ${gameData.status.detailedState}`;
    let description = `${winner.team.name} win${krakenWin ? "!" : "."}`;

    if (krakenWin) {
        description = `${Strings.REDLIGHT_EMBED} ${description} ${Strings.REDLIGHT_EMBED}`;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields([
            {
                name: `${winner.team.name}`,
                value: `Goals: **${winner.goals}**\nShots: ${winner.shotsOnGoal}`,
                inline: true,
            },
            {
                name: `${loser.team.name}`,
                value: `Goals: **${loser.goals}**\nShots: ${loser.shotsOnGoal}`,
                inline: true,
            },
        ])
        .setThumbnail(teamLogo);

    const start = format(new Date(), "yyyy-MM-dd");
    const season = await API.Seasons.GetCurrentSeason();
    const allGames = await API.Schedule.GetTeamSchedule(Kraken.TeamId, start, season?.seasonEndDate);
    const nextGame = allGames?.[0];
    if (nextGame) {
        const { name, value, inline } = ScheduledGameFieldFormatter(nextGame);
        embed.addFields({
            name: name,
            value: value,
            inline: inline,
        });
    }

    return embed;
};

export const createShootoutEmbed = (
    play: GameFeedResponse.AllPlay,
    shootoutPlays: GameFeedResponse.AllPlay[],
    teams: GameFeedResponse.LineScoreTeams
) => {
    // only grab shootout plays up until this play
    shootoutPlays = shootoutPlays.filter((x) => new Date(x.about.dateTime) <= new Date(play.about.dateTime));

    const { result, team } = play;
    const { description, eventTypeId } = result;
    let title = `${team?.name} - ${eventTypeId}`;
    const thumbnail = team ? Legacy_Paths.TeamLogo(team?.id) : "";
    const goal = eventTypeId === "GOAL";
    const kraken = team?.id === Kraken.TeamId;
    if (goal && kraken) {
        title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
    }

    if (!shootoutPlays?.[0]) {
        return;
    }
    const shootFirst = shootoutPlays[0].team?.triCode ?? "N/A";
    const shootSecond = teams.away.team.triCode == shootFirst ? teams.home.team.triCode : teams.away.team.triCode;

    const shootoutResults: {
        [abbr: string]: {
            result: string;
            player: string;
        }[];
    } = {};

    shootoutResults[shootFirst] = [];
    shootoutResults[shootSecond] = [];
    shootoutPlays.forEach((soPlay) => {
        const shooter = soPlay.players?.filter((p) => p.playerType != "Goalie")?.[0];
        shootoutResults[soPlay.team?.triCode ?? "N/A"].push({
            result: shootoutSymbol(soPlay),
            player: shooter?.player.fullName ?? "Unknown",
        });
    });

    const embed = new EmbedBuilder({
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

export const PlayoffRoundFormatter = (round: PlayoffStandings.Round) => {
    return {
        name: `${round.names.name}`,
        value: round.series?.[0]?.currentGame?.seriesSummary?.seriesStatus
            ? round.series
                  .map((series) => {
                      return PlayoffSeriesFormatter(series);
                  })
                  .join("\n\n")
            : "TBD",
    };
};

export const PlayoffSeriesFormatter = (series: PlayoffStandings.Series) => {
    return series?.currentGame?.seriesSummary?.seriesStatus
        ? `*${series.names.matchupName}*\n**${series.currentGame.seriesSummary.seriesStatus}**`
        : "TBD";
};

export class GameFeedEmbedFormatter {
    private teamsMap: Map<string, Team> = new Map<string, Team>();
    private roster: Map<string, RosterPlayer> = new Map<string, RosterPlayer>();
    private feed: PlayByPlayResponse;
    constructor(feed: PlayByPlayResponse) {
        this.feed = feed;
        const { awayTeam, homeTeam, rosterSpots } = this.feed;
        this.teamsMap.set(awayTeam.id, awayTeam);
        this.teamsMap.set(homeTeam.id, homeTeam);
        rosterSpots.forEach((player) => {
            this.roster.set(player.playerId, player);
        });
    }
    updateFeed = (feed: PlayByPlayResponse) => {
        this.feed = feed;
    };

    createGoalEmbed = async (goal: Play) => {
        const { details } = goal;
        if (!details) {
            return;
        }
        const { scoringPlayerId, assist1PlayerId, assist2PlayerId, homeScore, awayScore } = details;

        const scorer = this.roster.get(scoringPlayerId ?? "");
        const assist1 = this.roster.get(assist1PlayerId ?? "");
        const assist2 = this.roster.get(assist2PlayerId ?? "");

        const scoringTeam = this.teamsMap.get(goal.details?.eventOwnerTeamId ?? "");
        const { id: scoringTeamId } = scoringTeam ?? {};
        // we like the kraken
        const excitement = scoringTeamId == Kraken.TeamId;
        const goalString = `${excitement ? "GOAL!" : "goal"}`;

        // this is absolutely the worst way to do this
        // do not look at this code
        const { situationCode, homeTeamDefendingSide } = goal;
        const homeLeft = homeTeamDefendingSide == "left";

        const homeTeamId = this.feed.homeTeam.id;
        const homeTeam = this.teamsMap.get(homeTeamId);
        const awayTeamId = this.feed.awayTeam.id;
        const awayTeam = this.teamsMap.get(awayTeamId);

        const awaySOG = this.feed?.awayTeam.sog ?? 0;
        const homeSOG = this.feed?.homeTeam.sog ?? 0;

        const homeScored = homeTeamId == scoringTeamId;
        const leftScored = homeScored ? homeLeft : !homeLeft;
        const goalphrase = getSituationCodeString(situationCode, leftScored);

        let title = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} ${goalString}`;
        if (excitement) {
            title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
        }
        const unassisted = !assist1 && !assist2;
        const description = scorer
            ? `${excitement ? "## " : ""}${scorer.firstName.default} ${scorer.lastName.default} (${
                  goal.details?.scoringPlayerTotal
              })`
            : "Unknown player";
        const shotType = goal.details?.shotType;
        const goalTypeKeys = Object.keys(Strings.GOAL_TYPE_STRINGS);
        const shotTypeString =
            shotType && contains(goalTypeKeys, shotType)
                ? Strings.GOAL_TYPE_STRINGS[shotType as keyof typeof Strings.GOAL_TYPE_STRINGS]
                : "Unknown shot type";
        let secondaryDescription = `${shotTypeString}${unassisted ? ` - Unassisted` : ""}${
            goalphrase ? ` - ${goalphrase}` : ""
        }`;

        const fields = [];
        if (assist1) {
            fields.push({
                name: "1st Assist:",
                value: `${assist1?.firstName.default} ${assist1?.lastName.default} (${goal.details?.assist1PlayerTotal})`,
            });
        }
        if (assist2) {
            fields.push({
                name: "2nd Assist:",
                value: `${assist2?.firstName.default} ${assist2?.lastName.default} (${goal.details?.assist2PlayerTotal})`,
            });
        }
        fields.push(
            {
                name: `**${awayTeam?.commonName.default ?? "Away"}**`,
                value: `Goals: **${awayScore}**\nShots: ${awaySOG}`,
                inline: true,
            },
            {
                name: `**${homeTeam?.commonName.default ?? "Home"}**`,
                value: `Goals: **${homeScore}**\nShots: ${homeSOG}`,
                inline: true,
            }
        );

        // check for highlights and append to description
        if (details?.highlightClipSharingUrl) {
            const { highlightClipSharingUrl } = details;
            secondaryDescription += `\n[Watch](${highlightClipSharingUrl})`;
        }

        const { periodDescriptor, timeRemaining, eventId } = goal;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;
        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(scorer?.headshot ?? "")
            .setDescription(`${description}\n${secondaryDescription}`)
            .addFields([...fields, { name: "Event id:", value: `${eventId}` }])
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };
    createPenaltyEmbed = async (penalty: Play) => {
        const { details } = penalty;
        if (!details) {
            return;
        }
        // we like the kraken (reverse penalty edition)
        const excitement = details?.eventOwnerTeamId != Kraken.TeamId;
        const { committedByPlayerId, servedByPlayerId, drawnByPlayerId, eventOwnerTeamId, descKey } = details ?? {};
        const penaltyPlayer = this.roster.get(committedByPlayerId ?? servedByPlayerId ?? "");
        const drawnByPlayer = this.roster.get(drawnByPlayerId ?? "");
        const penaltyTeam = this.teamsMap.get(eventOwnerTeamId ?? "");

        // Seattle Kraken penalty(!)

        const title = `${penaltyTeam?.placeName.default} ${penaltyTeam?.commonName.default} penalty${
            excitement ? "!" : ""
        }`;
        const fields = [];
        // Penalty Description
        const penaltyTypeKeys = Object.keys(Strings.PENALTY_STRINGS);
        const penaltyDescription =
            descKey && contains(penaltyTypeKeys, descKey)
                ? Strings.PENALTY_STRINGS[descKey as keyof typeof Strings.PENALTY_STRINGS]
                : "Unknown penalty";
        fields.push({
            name: "Infraction:",
            value: penaltyDescription,
        });

        // committed or served
        const servedByString = `${committedByPlayerId ? "Committed" : "Served"} by`;
        if (penaltyPlayer) {
            fields.push({
                name: servedByString,
                value: `${penaltyPlayer?.firstName.default} ${penaltyPlayer?.lastName.default}`,
            });
        }
        if (drawnByPlayer) {
            fields.push({
                name: "Drawn by:",
                value: `${drawnByPlayer?.firstName.default} ${drawnByPlayer?.lastName.default}`,
            });
        }

        const { timeRemaining, periodDescriptor } = penalty;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Event id: ${penalty.eventId}`)
            .setThumbnail(penaltyPlayer?.headshot ?? "")
            .addFields(fields)
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };
    createIntermissionEmbed = async (periodEvent: Play) => {
        const { awayTeam: away, homeTeam: home } = this.feed;
        const { score: homeScore, sog: homeSOG } = home;
        const { score: awayScore, sog: awaySOG } = away;

        const { periodDescriptor } = periodEvent;
        const periodOrdinal = periodToStr(periodDescriptor.number || 1, periodDescriptor.periodType || "REG");
        const title = `${periodOrdinal} period has ${
            periodEvent.typeCode == EventTypeCode.periodEnd ? "ended" : "started"
        }.`;
        // const timeRemainingString = `${timeRemaining} remaining in the ${periodOrdinal} intermission`;

        const scoreFields = [
            {
                name: `**${away.commonName.default}**`,
                value: `Goals: **${awayScore}**\nShots: ${awaySOG}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${homeScore}**\nShots: ${homeSOG}`,
                inline: true,
            },
        ];
        // first intermission should always just say 'X' period has ended
        return new EmbedBuilder().setTitle(title).addFields(scoreFields).setFooter({ text: title }).setColor(39129);
    };
    updateIntermissionEmbed = async (periodEvent: Play, existingEmbed: Embed) => {
        // use these values to ensure we always are using the play's intermission / period value
        const { periodDescriptor, typeCode } = periodEvent;
        const playPeriod = periodDescriptor.number;
        const playPeriodOrdinal = periodToStr(playPeriod, periodDescriptor.periodType);

        // are we updating the current intermission's value? or just writing that it's ended
        const feed = this.feed;
        const isCurrentIntermission = feed.periodDescriptor.number == playPeriod;

        const timeRemainingString = isCurrentIntermission
            ? `${feed?.clock.timeRemaining ?? "00:00"} remaining in the ${playPeriodOrdinal} intermission`
            : `${playPeriodOrdinal} intermission has ended`;

        return new EmbedBuilder()
            .setTitle(existingEmbed.title)
            .setDescription(existingEmbed.description)
            .setFields(existingEmbed.fields)
            .setFooter({
                text:
                    typeCode == EventTypeCode.periodStart
                        ? `${playPeriodOrdinal} period has started".` // period start messages just say "period has started" (statestring),
                        : timeRemainingString, //  period end messages update intermission clock as the footer
            })
            .setColor(39129);
    };
    createGameEndEmbed = async () => {
        // TODO - kraken win additions
        // TODO - add highlight videos after the game 
        // TODO - three stars of the game
        const { awayTeam: away, homeTeam: home } = this.feed;
        const { score: homeScore, sog: homeSOG } = home;
        const { score: awayScore, sog: awaySOG } = away;

        const title = `Game Over!`;
        const scoreFields = [
            {
                name: `**${away.commonName.default}**`,
                value: `Goals: **${awayScore}**\nShots: ${awaySOG}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${homeScore}**\nShots: ${homeSOG}`,
                inline: true,
            },
        ];
        return new EmbedBuilder().setTitle(title).addFields(scoreFields).setColor(39129);
    }
}
