import { EmbedBuilder } from "discord.js";
import { GameFeedResponse, Play } from "../service/MLB/models/GameFeed";
import { Colors, Environment, getMLBTeamColor } from "./constants";
import { EmojiCache } from "./EmojiCache";
import { localizedTimeString } from "./helpers";

// Creates Discord embeds for MLB game events
export class MLBGameFeedEmbedFormatter {
    private feed: GameFeedResponse;

    constructor(feed: GameFeedResponse) {
        this.feed = feed;
    }

    updateFeed(feed: GameFeedResponse): void {
        this.feed = feed;
    }

    // at-bat results
    createPlayEmbed(play: Play): EmbedBuilder | undefined {
        const { result, about, count, matchup } = play;

        const inningStr = about.isTopInning ? "TOP" : "BOT";
        const inning = about.inning;
        const outs = count.outs;

        // Determine batting team (opposite of which half inning it is)
        const battingTeam = about.isTopInning ? this.feed.gameData.teams.away : this.feed.gameData.teams.home;

        // Get team emoji
        const teamEmoji = EmojiCache.getMLBTeamEmoji(battingTeam.abbreviation);
        const emojiStr = teamEmoji ? ` ${teamEmoji}` : "";

        let title = `${inningStr} ${inning}`;

        // Add baserunner indicators
        const baserunners = this.getBaserunnerIndicators(matchup);
        if (baserunners) {
            title += `\n${baserunners}`;
        }

        title += `\n${outs} Out${outs !== 1 ? "s" : ""}`;

        // Build description with count
        const countStr = `${count.balls}-${count.strikes}`;
        const description = `On a ${countStr} count:\n${emojiStr} ${result.description}`;

        // Build score box with labels - calculate runs up to current inning
        const scoreBox = this.buildScoreBox(inning);

        const timeStr = localizedTimeString(about.startTime);

        // Use team's primary color
        const teamColor = getMLBTeamColor(battingTeam.id);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(teamColor)
            .setFooter({ text: timeStr });

        // Add batter's headshot image
        const batterImageUrl = this.getPlayerHeadshotUrl(matchup.batter.id);
        if (batterImageUrl) {
            embed.setThumbnail(batterImageUrl);
        }

        if (scoreBox) {
            embed.addFields({ name: "\u200B", value: scoreBox, inline: false });
        }

        return embed;
    }

    createInningEndEmbed(play: Play, nextPlayIndex?: number): EmbedBuilder | undefined {
        const { about } = play;
        const inning = about.inning;

        const midEndLabel = about.isTopInning ? `Mid ${inning}` : `End ${inning}`;
        const scoreBox = this.buildScoreBox(inning);
        const nextBatters = this.getNextBattersInfo(about, nextPlayIndex);
        const description = scoreBox ? `${scoreBox}\n\n${nextBatters}` : nextBatters;

        return new EmbedBuilder()
            .setTitle(`------ ${midEndLabel} ------`)
            .setDescription(description)
            .setColor(Colors.MARINERS);
    }

    createPitchingChangeEmbed(play: Play): EmbedBuilder | undefined {
        const substitution = play.playEvents.find((e) => e.isSubstitution && e.position?.code === "1");

        if (!substitution || !substitution.player) {
            return undefined;
        }

        const { gameData } = this.feed;
        const { about } = play;
        const newPitcher = gameData.players[`ID${substitution.player.id}`];
        const replacedPitcher = substitution.replacedPlayer
            ? gameData.players[`ID${substitution.replacedPlayer.id}`]
            : null;

        if (!newPitcher) return undefined;

        // Determine which team based on half inning (pitching team is opposite of batting team)
        const pitchingTeamData = about.halfInning === "top" ? gameData.teams.home : gameData.teams.away;

        // Get team emoji
        const teamEmoji = EmojiCache.getMLBTeamEmoji(pitchingTeamData.abbreviation);
        const emojiStr = teamEmoji ? ` ${teamEmoji}` : "";

        const description = replacedPitcher
            ? `${newPitcher.boxscoreName} replaces ${replacedPitcher.boxscoreName} for the ${pitchingTeamData.teamName}.`
            : `${newPitcher.boxscoreName} now pitching for the ${pitchingTeamData.teamName}.`;

        const timeStr = localizedTimeString(play.about.startTime);

        // Use pitching team's color
        const teamColor = getMLBTeamColor(pitchingTeamData.id);

        const embed = new EmbedBuilder()
            .setTitle(`Pitching Change${emojiStr}`)
            .setDescription(description)
            .setFooter({ text: timeStr })
            .setColor(teamColor);

        // Add new pitcher's headshot image
        const pitcherImageUrl = this.getPlayerHeadshotUrl(newPitcher.id);
        if (pitcherImageUrl) {
            embed.setThumbnail(pitcherImageUrl);
        }

        return embed;
    }

    createGameEndEmbed(): EmbedBuilder | undefined {
        const { teams } = this.feed.gameData;
        const { linescore } = this.feed.liveData;

        const awayScore = linescore.teams.away.runs;
        const homeScore = linescore.teams.home.runs;
        const winner = awayScore > homeScore ? teams.away : teams.home;
        const loser = awayScore > homeScore ? teams.home : teams.away;
        const winnerScore = Math.max(awayScore, homeScore);
        const loserScore = Math.min(awayScore, homeScore);

        const winnerEmoji = EmojiCache.getMLBTeamEmoji(winner.abbreviation);
        const loserEmoji = EmojiCache.getMLBTeamEmoji(loser.abbreviation);

        const title = `${winner.teamName} Win${winner.id === parseInt(Environment.HOCKEYBOT_MLB_TEAM_ID!) ? "!" : ""}`;
        const description = `${winnerEmoji} ${winner.teamName} **${winnerScore}**\n${loserEmoji} ${loser.teamName} **${loserScore}**`;

        const lineScore = this.buildLineScore();

        // Use winning team's color
        const winnerColor = getMLBTeamColor(winner.id);

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .addFields({ name: "\u200B", value: lineScore || "Final", inline: false })
            .setColor(winnerColor);
    }

    /**
     * Builds a score box showing current game state
     * Format:
     * ```
     *     R  H  E
     * DET 2  8  2
     * SEA 3  8  0
     * ```
     * @param maxInning - Calculate runs only up to this inning (optional)
     */
    private buildScoreBox(maxInning?: number): string | undefined {
        const { teams } = this.feed.gameData;
        const { linescore } = this.feed.liveData;

        if (!linescore?.teams) return undefined;

        const awayAbbrev = teams.away.abbreviation;
        const homeAbbrev = teams.home.abbreviation;

        let awayRuns: number;
        let homeRuns: number;

        if (maxInning !== undefined && linescore.innings && linescore.innings.length > 0) {
            // Sum runs from completed innings
            awayRuns = linescore.innings
                .slice(0, maxInning)
                .reduce((sum, inning) => sum + (inning?.away?.runs ?? 0), 0);
            homeRuns = linescore.innings
                .slice(0, maxInning)
                .reduce((sum, inning) => sum + (inning?.home?.runs ?? 0), 0);
        } else {
            // Use current totals
            awayRuns = linescore.teams.away.runs ?? 0;
            homeRuns = linescore.teams.home.runs ?? 0;
        }

        const awayRunsStr = awayRuns.toString().padStart(2);
        const homeRunsStr = homeRuns.toString().padStart(2);

        const awayHits = (linescore.teams.away.hits ?? 0).toString().padStart(2);
        const homeHits = (linescore.teams.home.hits ?? 0).toString().padStart(2);

        const awayErrors = (linescore.teams.away.errors ?? 0).toString().padStart(2);
        const homeErrors = (linescore.teams.home.errors ?? 0).toString().padStart(2);

        // Use non-breaking spaces for consistent alignment in Discord
        const NBSP = "\u00A0";
        const NBSP_2 = NBSP.repeat(2); // Column separator
        const NBSP_3 = NBSP.repeat(3); // Column spacing
        const NBSP_6 = NBSP.repeat(6); // Header indent

        // Pad abbreviations to consistent width (3 chars for MLB teams) using NBSP
        const awayAbbrevPadded = awayAbbrev.padEnd(3, NBSP);
        const homeAbbrevPadded = homeAbbrev.padEnd(3, NBSP);

        // Pad numbers with NBSP for consistent width
        const awayRunsPadded = awayRunsStr.padStart(2, NBSP);
        const homeRunsPadded = homeRunsStr.padStart(2, NBSP);
        const awayHitsPadded = awayHits.padStart(2, NBSP);
        const homeHitsPadded = homeHits.padStart(2, NBSP);
        const awayErrorsPadded = awayErrors.padStart(2, NBSP);
        const homeErrorsPadded = homeErrors.padStart(2, NBSP);

        return `\`\`\`
${NBSP_6}R${NBSP_3}H${NBSP_3}E
${awayAbbrevPadded}${NBSP_2}${awayRunsPadded}${NBSP_2}${awayHitsPadded}${NBSP_2}${awayErrorsPadded}
${homeAbbrevPadded}${NBSP_2}${homeRunsPadded}${NBSP_2}${homeHitsPadded}${NBSP_2}${homeErrorsPadded}\`\`\``;
    }

    /**
     * Gets info about the next batters - shows the NEXT team's batting order
     * In live games, uses linescore.defense (the team that's about to bat)
     * In replays, scans ahead through plays to find the next batters
     */
    private getNextBattersInfo(about: any, nextPlayIndex?: number): string {
        const { gameData } = this.feed;
        const { linescore } = this.feed.liveData;

        // Determine which team bats next (opposite of current half inning)
        const nextBattingTeam = about.isTopInning ? gameData.teams.home : gameData.teams.away;
        const teamEmoji = EmojiCache.getMLBTeamEmoji(nextBattingTeam.abbreviation);
        const emojiStr = teamEmoji ? `${teamEmoji} ` : "";

        // For live games, use linescore.defense (they're about to become offense)
        if (nextPlayIndex === undefined && linescore?.defense?.team?.id === nextBattingTeam.id) {
            const batters = [
                linescore.defense.batter?.fullName,
                linescore.defense.onDeck?.fullName,
                linescore.defense.inHole?.fullName,
            ].filter((name) => !!name);

            if (batters.length > 0) {
                return `**${emojiStr}Due up:** ${batters.join(", ")}`;
            }
        }

        // For replays or if live linescore doesn't match, scan plays
        if (nextPlayIndex !== undefined) {
            const { allPlays } = this.feed.liveData.plays;
            const batters: string[] = [];

            for (let i = nextPlayIndex; i < allPlays.length && batters.length < 3; i++) {
                const play = allPlays[i];
                const playTeamId = play.about.isTopInning ? gameData.teams.away.id : gameData.teams.home.id;

                // Find plays from the next batting team
                if (playTeamId === nextBattingTeam.id) {
                    const batterId = play.matchup?.batter?.id;
                    if (batterId) {
                        const batter = gameData.players[`ID${batterId}`];
                        if (batter && !batters.includes(batter.boxscoreName)) {
                            batters.push(batter.boxscoreName);
                        }
                    }
                }
            }

            if (batters.length > 0) {
                return `**${emojiStr}Due up:** ${batters.join(", ")}`;
            }
        }

        // Fallback if we can't determine the batters
        return `**${emojiStr}Due up:** TBD`;
    }

    /**
     * Builds full line score showing all innings
     * Splits into multiple lines if more than 10 innings
     */
    private buildLineScore(maxInning?: number): string | undefined {
        const { teams } = this.feed.gameData;
        const { linescore } = this.feed.liveData;

        if (!linescore?.teams || !linescore?.innings || linescore.innings.length === 0) {
            return undefined;
        }

        const inningsToShow = maxInning ? linescore.innings.slice(0, maxInning) : linescore.innings;

        const lineScoreData = {
            awayName: teams.away.teamName,
            homeName: teams.home.teamName,
            awayInnings: this.extractInningRuns(inningsToShow, "away"),
            homeInnings: this.extractInningRuns(inningsToShow, "home"),
            awayTotals: this.formatTeamTotals(linescore.teams.away),
            homeTotals: this.formatTeamTotals(linescore.teams.home),
        };

        return inningsToShow.length <= 10
            ? this.formatSingleLineScore(lineScoreData)
            : this.formatMultiLineScore(lineScoreData);
    }

    /**
     * Extracts run totals for each inning for a specific team
     */
    private extractInningRuns(innings: any[], team: "away" | "home"): string[] {
        return innings.map((inning) => {
            const runs = inning?.[team]?.runs;
            return runs !== undefined && runs !== null ? runs.toString() : "0";
        });
    }

    /**
     * Formats team totals (R H E)
     */
    private formatTeamTotals(teamStats: any): string {
        const NBSP = "\u00A0";
        const NBSP_2 = NBSP.repeat(2);
        const runs = (teamStats?.runs ?? 0).toString().padStart(2, NBSP);
        const hits = (teamStats?.hits ?? 0).toString().padStart(2, NBSP);
        const errors = (teamStats?.errors ?? 0).toString().padStart(2, NBSP);
        return `${runs}${NBSP_2}${hits}${NBSP_2}${errors}`;
    }

    /**
     * Formats line score for games with 10 or fewer innings
     */
    private formatSingleLineScore(data: {
        awayName: string;
        homeName: string;
        awayInnings: string[];
        homeInnings: string[];
        awayTotals: string;
        homeTotals: string;
    }): string {
        const NBSP = "\u00A0";
        const NBSP_2 = NBSP.repeat(2);
        const NBSP_3 = NBSP.repeat(3);
        const NBSP_6 = NBSP.repeat(6);
        const INNING_WIDTH = 2;

        // Use abbreviations instead of full names
        const { teams } = this.feed.gameData;
        const awayAbbrev = teams.away.abbreviation.padEnd(3, NBSP);
        const homeAbbrev = teams.home.abbreviation.padEnd(3, NBSP);

        const inningNumbers = this.formatInningHeaders(1, data.awayInnings.length, INNING_WIDTH);
        const awayLine = data.awayInnings.map((r) => r.padStart(INNING_WIDTH, NBSP)).join(NBSP);
        const homeLine = data.homeInnings.map((r) => r.padStart(INNING_WIDTH, NBSP)).join(NBSP);

        return `\`\`\`
${NBSP_6}${inningNumbers}${NBSP_3}R${NBSP_3}H${NBSP_3}E
${awayAbbrev}${NBSP_3}${awayLine}${NBSP_2}${data.awayTotals}
${homeAbbrev}${NBSP_3}${homeLine}${NBSP_2}${data.homeTotals}\`\`\``;
    }

    /**
     * Formats line score for games with more than 10 innings (extra innings)
     */
    private formatMultiLineScore(data: {
        awayName: string;
        homeName: string;
        awayInnings: string[];
        homeInnings: string[];
        awayTotals: string;
        homeTotals: string;
    }): string {
        const NBSP = "\u00A0";
        const NBSP_2 = NBSP.repeat(2);
        const NBSP_3 = NBSP.repeat(3);
        const NBSP_6 = NBSP.repeat(6);
        const INNING_WIDTH = 2;
        const INNINGS_PER_ROW = 10;

        // Use abbreviations instead of full names
        const { teams } = this.feed.gameData;
        const awayAbbrev = teams.away.abbreviation.padEnd(3, NBSP);
        const homeAbbrev = teams.home.abbreviation.padEnd(3, NBSP);

        // First 10 innings
        const firstRowNumbers = this.formatInningHeaders(1, INNINGS_PER_ROW, INNING_WIDTH);
        const awayFirstRow = data.awayInnings
            .slice(0, INNINGS_PER_ROW)
            .map((r) => r.padStart(INNING_WIDTH, NBSP))
            .join(NBSP);
        const homeFirstRow = data.homeInnings
            .slice(0, INNINGS_PER_ROW)
            .map((r) => r.padStart(INNING_WIDTH, NBSP))
            .join(NBSP);

        // Extra innings (11+)
        const extraInningsCount = data.awayInnings.length - INNINGS_PER_ROW;
        const secondRowNumbers = this.formatInningHeaders(INNINGS_PER_ROW + 1, extraInningsCount, INNING_WIDTH);
        const awaySecondRow = data.awayInnings
            .slice(INNINGS_PER_ROW)
            .map((r) => r.padStart(INNING_WIDTH, NBSP))
            .join(NBSP);
        const homeSecondRow = data.homeInnings
            .slice(INNINGS_PER_ROW)
            .map((r) => r.padStart(INNING_WIDTH, NBSP))
            .join(NBSP);

        return `\`\`\`
${NBSP_6}${firstRowNumbers}
${awayAbbrev}${NBSP_3}${awayFirstRow}
${homeAbbrev}${NBSP_3}${homeFirstRow}

${NBSP_6}${secondRowNumbers}${NBSP_3}R${NBSP_3}H${NBSP_3}E
${awayAbbrev}${NBSP_3}${awaySecondRow}${NBSP_2}${data.awayTotals}
${homeAbbrev}${NBSP_3}${homeSecondRow}${NBSP_2}${data.homeTotals}\`\`\``;
    }

    private formatInningHeaders(start: number, count: number, width: number): string {
        const NBSP = "\u00A0";
        return Array.from({ length: count }, (_, i) => (start + i).toString().padStart(width, NBSP)).join(NBSP);
    }

    private getBaserunnerIndicators(matchup: any): string | undefined {
        const first = matchup.postOnFirst ? "◆" : "◇";
        const second = matchup.postOnSecond ? "◆" : "◇";
        const third = matchup.postOnThird ? "◆" : "◇";

        return `\u00A0\u00A0\u00A0\u00A0\u00A0${second}\n${third}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${first}`;
    }

    private getPlayerHeadshotUrl(playerId: number): string | undefined {
        if (!playerId) return undefined;

        return `https://content.mlb.com/images/headshots/current/60x60/${playerId}.png`;
    }
}

export const MLBGameAnnouncementEmbedBuilder = async (feed: GameFeedResponse): Promise<EmbedBuilder> => {
    const { teams, players } = feed.gameData;
    const { datetime, venue } = feed.gameData;
    const { boxscore } = feed.liveData;

    const awayEmoji = EmojiCache.getMLBTeamEmoji(teams.away.abbreviation);
    const homeEmoji = EmojiCache.getMLBTeamEmoji(teams.home.abbreviation);

    const title = `${awayEmoji} ${teams.away.teamName} @ ${homeEmoji} ${teams.home.teamName}`;

    let description = `Game Time: ${datetime.time} ${datetime.ampm}\n${venue.name}`;

    if (boxscore?.teams?.away?.battingOrder && boxscore.teams.away.battingOrder.length >= 1) {
        const leadoffBatter = players[`ID${boxscore.teams.away.battingOrder[0]}`];

        if (leadoffBatter) {
            description += `\n\n**${awayEmoji} First up:** ${leadoffBatter.boxscoreName}`;
        }
    }

    const homeTeamColor = getMLBTeamColor(teams.home.id);

    return new EmbedBuilder().setTitle(title).setDescription(description).setColor(homeTeamColor);
};
