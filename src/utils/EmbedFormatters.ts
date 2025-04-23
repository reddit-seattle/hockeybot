import { format, utcToZonedTime } from "date-fns-tz";
import { ApplicationEmoji, Collection, Embed, EmbedBuilder } from "discord.js";
import { contains } from "underscore";
import { API } from "../service/NHL/API";
import { Game as DayScheduleGame } from "../service/NHL/models/DaySchedule";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/NHL/models/PlayByPlayResponse";
import { Game as TeamMonthlyScheduleGame } from "../service/NHL/models/TeamMonthlyScheduleResponse";
import { Game as TeamWeeklyScheduleGame } from "../service/NHL/models/TeamWeeklyScheduleResponse";
import { Colors, Config, Strings, TeamIds } from "./constants";
import { EventTypeCode } from "./enums";
import { getSituationCodeString, periodToStr, relativeDateString } from "./helpers";
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

    createGoalEmbed = (goal: Play) => {
        const { details } = goal;
        if (!details) {
            return;
        }
        const { scoringPlayerId, assist1PlayerId, assist2PlayerId, homeScore, awayScore } = details;
        const { periodDescriptor, timeRemaining, eventId, situationCode } = goal;

        const scorer = this.roster.get(scoringPlayerId ?? "");
        const assist1 = this.roster.get(assist1PlayerId ?? "");
        const assist2 = this.roster.get(assist2PlayerId ?? "");

        const scoringTeam = this.teamsMap.get(goal.details?.eventOwnerTeamId ?? "");
        const { id: scoringTeamId } = scoringTeam ?? {};
        // we like the kraken
        const excitement = scoringTeamId == TeamIds.Kraken;
        const goalString = `goal${excitement ? "!" : ""}`;

        const homeTeamId = this.feed.homeTeam.id;
        const awayTeamId = this.feed.awayTeam.id;
        const awayTeam = this.teamsMap.get(awayTeamId);
        const homeTeam = this.teamsMap.get(homeTeamId);

        // this is wild, don't look at it
        const goalphrase = getSituationCodeString(situationCode, homeTeamId == scoringTeamId);

        let title = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} ${goalString}`;
        if (excitement) {
            title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
        }
        const unassisted = !assist1 && !assist2;
        const description = scorer
            ? `${excitement ? "### " : ""}${scorer.firstName.default} ${scorer.lastName.default} (${
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
        const awaySOG = this.feed?.awayTeam.sog ?? 0;
        const homeSOG = this.feed?.homeTeam.sog ?? 0;

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

        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor?.number || 1,
            periodDescriptor?.periodType || "REG"
        )} period`;
        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(scorer?.headshot ?? "")
            .setDescription(`${description}\n${secondaryDescription}`)
            .addFields([...fields, { name: "Event id:", value: `${eventId}` }])
            .setFooter({ text: timeRemainingString })
            .setColor(Colors.KRAKEN_EMBED);
    };
    createPenaltyEmbed = (penalty: Play) => {
        const { details } = penalty;
        if (!details) {
            return;
        }
        // we like the kraken (reverse penalty edition)
        const excitement = details?.eventOwnerTeamId != TeamIds.Kraken;
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
            periodDescriptor?.number || 1,
            periodDescriptor?.periodType || "REG"
        )} period`;

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Event id: ${penalty.eventId}`)
            .setThumbnail(penaltyPlayer?.headshot ?? "")
            .addFields(fields)
            .setFooter({ text: timeRemainingString })
            .setColor(Colors.KRAKEN_EMBED);
    };
    // todo - different intermission embeds per period
    // 1st period started - show teams with points line / maybe starting goaltenders or odds?
    // 1st intermission - normal
    // 2nd intermission - hoist the colors?
    // 3rd intermission - OT coming or game end
    createIntermissionEmbed = (periodEvent: Play) => {
        const { awayTeam: away, homeTeam: home } = this.feed;
        const { score: homeScore, sog: homeSOG } = home;
        const { score: awayScore, sog: awaySOG } = away;

        const { periodDescriptor } = periodEvent;
        const periodOrdinal = periodToStr(periodDescriptor?.number || 1, periodDescriptor?.periodType || "REG");
        const title = `${periodOrdinal} period has ${
            periodEvent.typeCode == EventTypeCode.periodEnd ? "ended" : "started"
        }.`;
        if (periodEvent.typeCode == EventTypeCode.periodStart && periodDescriptor?.number == 1) {
            return new EmbedBuilder()
                .setTitle(title)
                .setDescription(`${this.feed.venue.default}`)
                .addFields([
                    {
                        name: `**${away.commonName.default}**`,
                        value: away?.radioLink ? `[${away.abbrev} Audio](${away.radioLink})` : "No radio link",
                        inline: true,
                    },
                    {
                        name: `**${home.commonName.default}**`,
                        value: home?.radioLink ? `[${home.abbrev} Audio](${home.radioLink})` : "No radio link",
                        inline: true,
                    },
                ])
                .setFooter({ text: "Game Start" })
                .setColor(Colors.KRAKEN_EMBED);
        }

        const scoreFields = [
            {
                name: `**${away.commonName.default}**`,
                value: `Goals: **${awayScore ?? 0}**\nShots: ${awaySOG ?? 0}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${homeScore ?? 0}**\nShots: ${homeSOG ?? 0}`,
                inline: true,
            },
        ];
        // first intermission should always just say 'X' period has ended
        return new EmbedBuilder()
            .setTitle(title)
            .addFields(scoreFields)
            .setFooter({ text: title })
            .setColor(Colors.KRAKEN_EMBED);
    };
    updateIntermissionEmbed = (periodEvent: Play, existingEmbed: Embed) => {
        // only update current intermission object
        const { periodDescriptor, typeCode } = periodEvent;
        const playPeriod = periodDescriptor?.number || 1;
        const playPeriodOrdinal = periodToStr(playPeriod, periodDescriptor?.periodType || "REG");
        const feed = this.feed;
        const isCurrentIntermission = feed.periodDescriptor.number == playPeriod;

        const timeRemainingString = isCurrentIntermission
            ? `${feed?.clock.timeRemaining ?? "00:00"} remaining in the ${playPeriodOrdinal} intermission`
            : `${playPeriodOrdinal} intermission has ended`;

        return EmbedBuilder.from(existingEmbed).setFooter({
            text:
                typeCode == EventTypeCode.periodStart
                    ? `${playPeriodOrdinal} period has started.` // period start messages just say "period has started" (statestring),
                    : timeRemainingString, //  period end messages update intermission clock as the footer
        });
    };
    createGameEndEmbed = () => {
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
                value: `Goals: **${awayScore ?? 0}**\nShots: ${awaySOG ?? 0}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${homeScore ?? 0}**\nShots: ${homeSOG ?? 0}`,
                inline: true,
            },
        ];
        return new EmbedBuilder().setTitle(title).addFields(scoreFields).setColor(Colors.KRAKEN_EMBED);
    };
}

export const GameAnnouncementEmbedBuilder = async (gameId: string) => {
    const boxScore = await API.Games.GetBoxScore(gameId);
    const { homeTeam, awayTeam, venue, startTimeUTC } = boxScore;
    const title = `Pregame: ${homeTeam.commonName.default} vs ${awayTeam.commonName.default}`;
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(`Puck drop: ${relativeDateString(startTimeUTC)} @ ${venue.default}`)
        .setColor(Colors.KRAKEN_EMBED);
};

// TODO - move appemojis to a static module and load them once
export const ScheduleEmbedBuilder = async (
    schedule: (DayScheduleGame | TeamWeeklyScheduleGame | TeamMonthlyScheduleGame)[],
    scheduleTypeDisplay: string,
    emojis?: Collection<string, ApplicationEmoji>
) => {
    const fields = await Promise.all(
        schedule.map(async (item) => {
            const { startTimeUTC, venue, awayTeam, homeTeam } = item;
            const dateSlug = relativeDateString(startTimeUTC);
            const dateStr = `${format(
                utcToZonedTime(startTimeUTC, Config.TIME_ZONE),
                Config.BODY_DATE_FORMAT
            )} (${dateSlug})`;
            const venuStr = `Venue: ${venue.default}`;
            let output = `${dateStr}\n${venuStr}`;
            // only show radio links if available
            const { radioLink: awayAudio } = awayTeam;
            const { radioLink: homeAudio } = homeTeam;
            const homeRadioStr = homeAudio && `[${homeTeam.abbrev}](${homeAudio})`;
            const awayRadioStr = awayAudio && `[${awayTeam.abbrev}](${awayAudio})`;
            if (homeRadioStr || awayRadioStr) {
                output += `\nListen: ${[homeRadioStr, awayRadioStr].filter((x) => x != undefined).join(" - ")}`;
            }
            let title = `${awayTeam.abbrev} vs ${homeTeam.abbrev}`;
            if (emojis) {
                const awayEmoji = emojis.find((emoji) => emoji.name === awayTeam.abbrev.toUpperCase());
                const homeEmoji = emojis.find((emoji) => emoji.name === homeTeam.abbrev.toUpperCase());
                title = `${awayEmoji} ${awayTeam.abbrev} vs ${homeTeam.abbrev} ${homeEmoji}`;
            }

            return {
                name: title,
                value: output,
                inline: false,
            };
        })
    );
    return new EmbedBuilder()
        .setTitle(`${scheduleTypeDisplay} Schedule`)
        .setFields(fields)
        .setColor(Colors.KRAKEN_EMBED);
};
