import { Embed, EmbedBuilder } from "discord.js";
import { contains } from "underscore";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { Kraken, Strings } from "./constants";
import { EventTypeCode } from "./enums";
import { getSituationCodeString, periodToStr } from "./helpers";

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
    createPenaltyEmbed = (penalty: Play) => {
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
    createIntermissionEmbed = (periodEvent: Play) => {
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
    updateIntermissionEmbed = (periodEvent: Play, existingEmbed: Embed) => {
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
                        ? `${playPeriodOrdinal} period has started.` // period start messages just say "period has started" (statestring),
                        : timeRemainingString, //  period end messages update intermission clock as the footer
            })
            .setColor(39129);
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
    };
}
