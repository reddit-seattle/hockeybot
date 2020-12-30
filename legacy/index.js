const request = require('request');
const _ = require('underscore');
const moment = require('moment-timezone');
const cron = require('cron');
const simpleBarrier = require('simple-barrier');
const Discord = require('discord.js');
const dotenv = require('dotenv').config();
const TEAMS = require('./teams.json');
const DIVISIONS = require('./div.json');
const CONFERENCES = require('./conf.json');

const cronDAILY = '0 9 * * *'
const cronHOURLY = '0 * * * *'
const bot_footer_image = `https://i.imgur.com/xHcfK8Q.jpg`;
const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;
const APIHOST = `https://statsapi.web.nhl.com`;
const API_URL = `${APIHOST}/api/v1`;
const SCHEDULE_URL = `${API_URL}/schedule`;

const client = new Discord.Client();
const teamStandings = {};

/**
 * Utility functions for returning grouped / sorted standings by conference, division, or overall
 * TODO : Roll these into classes / modules
 */
StandingsByDivision = (divId) => {
    return _.chain(teamStandings)
        .filter((team) => team.division.id == divId)
        .sortBy((team) => parseInt(team.record.divisionRank))
        .value()
        
};
StandingsByConference = (confId) => {
    return _.chain(teamStandings)
        .filter((team) => team.conference.id == confId)
        .sortBy((team) => parseInt(team.record.conferenceRank))
        .value();
};
LeagueStandings = () => {
    return _.sortBy(teamStandings, (team) => parseInt(team.record.leagueRank));
};

GetStandingsString = (teamRecord) => {
    return `${teamRecord.points} points (` +
    `${teamRecord.leagueRecord.wins}-${teamRecord.leagueRecord.losses}-${teamRecord.leagueRecord.ot})`;
}
GetTeamByAbbrev = (abbrev) => {
   const filter = _.filter(TEAMS, (team) => team.abbreviation == abbrev.toUpperCase());
   return filter && filter[0] ? filter[0] : null;
}
GetTeamById = (id) =>{
    return TEAMS[`${id}`] || null;
}

//Message handling
// TODO: roll this into a class / module
client.on('message', (message) => {
    //today's schedule
    if (message.content.startsWith('$schedule')) {
        createSchedule((embed) => {
            message.channel.send(embed);
        });
    }
    //team, conference, division standings
    else if (message.content.startsWith('$standings')) {
        const query = message.content.split(' ')[1];
        if(!query){
            message.channel.send('League/Wildcard standings not available');
            return;
        }
        const q = query.toUpperCase();
        const team = GetTeamByAbbrev(q);
            
        if (team) {
            const teamId = team.id;
            const teamRecord = teamStandings[teamId].record;
            const msg = GetStandingsString(teamRecord);
            message.channel.send(`${team.name} - ${msg}`);
        }
        else if (DIVISIONS[q]) {
            const divStandings = StandingsByDivision(DIVISIONS[q]);
            const embed = GetEmbedMessage(`${divStandings[0].division.name} Division Standings`);
            _.each(divStandings, (standing, i) => {
                embed.addField(GetStandingsString(standing.record), `${i+1}. ${standing.record.team.name}`);
            });
            message.channel.send(embed);
        }
        else if (CONFERENCES[q]) {
            const confStandings = StandingsByConference(CONFERENCES[q]);
            const embed = GetEmbedMessage(`${confStandings[0].conference.name} Conference Standings`);
            _.each(confStandings, (standing, i) => {
                embed.addField(GetStandingsString(standing.record), `${i+1}. ${standing.record.team.name}`);
            });
            message.channel.send(embed);
        }
        else{
            message.channel.send(`No standings results for ${query}`);
        }

    }
    //last x games for a team (limit 4 weeks time)
    else if (message.content.startsWith('$last')) {
        const args = message.content.split(' ');
        if (args.length < 3 || isNaN(parseInt(args[1]))) {
            message.channel.send(`Last x games usage: '$last 5 PHI'\r\nNote: This query only has access to one month of game history.`);
        }
        else {
            const games = parseInt(args[1]);
            const team = GetTeamByAbbrev(args[2]);
            if (!team) {
                message.channel.send(`Invalid team abbreviation: ${args[2]}`);
            }
            else {
                const today = moment(new Date()).tz('America/Los_Angeles');
                const endDate = today.format('YYYY-MM-DD');

                const start = today.subtract(4, 'week'); 
                const startDate = start.format('YYYY-MM-DD');
                var barrier = simpleBarrier();
                var embed = GetEmbedMessage(`Today's Games`);
                request(
                    {
                        url: `${SCHEDULE_URL}?startDate=${startDate}&endDate=${endDate}&teamId=${team.id}`,
                        json: true
                    },
                    (err, response, data) => {
                        if(data && data.dates && data.dates.length > 0){
                            const gameLinks = _.chain(data.dates).last(games).pluck('games').flatten(true).pluck('link').value();
                            _.each(gameLinks, (link) => {
                                request(
                                    {
                                        url: `${APIHOST}${link}`,
                                        json: true
                                    },
                                    barrier.waitOn(parseGameResult.bind(null, team))
                                )
                            });
                        }
                        else{
                            message.channel.send('No games in the past month for that team');
                        }
                    }
                );

                barrier.endWith((fields) => {
                    message.channel.send(fields.join('\r\n'));
                });
            }
        }
    }
    else if(message.content.startsWith('$chance')) {
        const team = message.content.split(' ')[1] || null;
        const teamObj = team && GetTeamByAbbrev(team);
        request(
            {
                url: 'http://www.sportsclubstats.com/d/NHL_ChanceWillMakePlayoffs_Small_D.json',
                json: true
            }, 
            (err, response, data) => {
                    const standings = data.data.filter(d => d.label === teamObj.name)[0] || null;
                    message.channel.send(standings ? `The ${teamObj.name} have a ${standings.data[standings.data.length-1]} percent chance of making the postseason` : 'Error finding team by abbreviation');
            });
        }
    else if(message.content === '$scores') {
        showScores((embed) => {
            message.channel.send(embed);
        });
    }
});

//say hello when online (insert your server ID here )
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    if (!DEBUG) {
        //try to announce to servers when you go online
        _.each(client.guilds.array(), (guild) => {
            const debugChannel = guild.channels.find('name', 'debug');
            debugChannel && debugChannel.send("HockeyBot, reporting for duty!"); 
            //testing game channels on one server (lots of channel spam)
            // if (guild.id == '[guildID]') {
            //     updateGameChannels(guild);
            // }
        });
    }
    await GetStandings(updateStandings);
});

/**
 * Async call to the API to get team standings, then passes result to callback
 */
GetStandings = async (next) => {
    await request(
        {
            url: `${API_URL}/standings`,
            json: true
        },
        next
    );
};

//log errors to the console
client.on('error', console.error);

/**
 * Updates the current standings object for each team, in each division
 * Post: Standings object has team record, conference and division rank
 */
updateStandings = function (error, response, data) {
    if (data && data.records && data.records.length > 0) {
        _.each(data.records, (divisionRecord) => {
            _.each(divisionRecord.teamRecords, (teamRecord) => {
                let standingsObj = {};
                standingsObj.record = teamRecord;
                standingsObj.division = divisionRecord.division;
                standingsObj.conference = divisionRecord.conference;
                teamStandings[teamRecord.team.id] = standingsObj;
            });
        });
    }
};

//parse game JSON to return 'fields' for games:
// name: Team A @ Team B
// value: 4:00 PT - Hockey Arena, USA
parseGame = (error, response, data) => {
    var results = [];
    if (data && data.dates && data.dates[0] && data.dates[0].games) {
        _.each(data.dates[0].games, (game) => {
            let matchup = `${game.teams.away.team.name} @ ${game.teams.home.team.name}`;
            let time = moment(game.gameDate).tz('America/Los_Angeles').format('HH:mm') + ' PT';
            results.push({
                name: matchup,
                value: `${time} - ${game.venue.name}`
            });
        });
    }
    return results;
};
parseGameResult = (team, eror, response, data) => {
    if(data && data.gameData && data.gameData.status && data.gameData.status.abstractGameState === "Final"){
        const away = data.liveData.linescore.teams.away;
        const home = data.liveData.linescore.teams.home;
        const winLoss = team.id == (away.goals > home.goals ? away.team.id : home.team.id);
        resultStr = `${away.team.abbreviation} - ${away.goals} @ ${home.team.abbreviation} - ${home.goals}`;
         resultStr += ` ${data.liveData.linescore.currentPeriodTimeRemaining}`;
        if(data.liveData.linescore.currentPeriodOrdinal != "3rd"){
            resultStr += ` ${data.liveData.linescore.currentPeriodOrdinal}`;
        }
        resultStr += winLoss ? ' | W' : (data.liveData.linescore.currentPeriodOrdinal == "3rd" ? ' | L' : ' | ' + data.liveData.linescore.currentPeriodOrdinal);
        return resultStr;
    }
};
getToday = () => {
    return moment().tz('America/Los_Angeles').format('YYYY-MM-DD');
}
createSchedule = (callback) => {
    var barrier = simpleBarrier();
    var embed = GetEmbedMessage(`Today's Games`);
    var today = getToday();
    request(
        {
            url: `${SCHEDULE_URL}?date=${today}`,
            json: true
        },
        barrier.waitOn(parseGame)
    );

    barrier.endWith((fields) => {
        if (fields[0] && fields[0].length > 0) {
            _.each(fields[0], (field) => {
                embed.addField(field.value, field.name, false);
                // embed.addBlankField(true);
            });
            callback(embed);
        }
        else {
            // embed.addField("No Games", "No games scheduled today :(", false);
            callback(null);
        }
        

    });
};

showScores = (callback) => {
    var barrier = simpleBarrier();
    var embed = GetEmbedMessage(`Today's Scores (feature WIP)`);
    var today = getToday();
    request(
        {
            url: `${SCHEDULE_URL}?date=${today}`,
            json: true
        },
        barrier.waitOn((error, response, data) => {
            var results = [];
            if (data && data.dates && data.dates[0] && data.dates[0].games) {
                _.each(data.dates[0].games, (game) => {
                    if(game.status.codedGameState != 1){
                        let matchup = `${game.teams.away.team.name} - ${game.teams.away.score} @ ${game.teams.home.team.name} - ${game.teams.home.score}`;
                        results.push({
                            name: matchup,
                            value: game.status.detailedState
                        });
                    }
                });
            }
            return results;
        })
    );

    barrier.endWith((fields) => {
        if (fields[0] && fields[0].length > 0) {
            _.each(fields[0], (field) => {
                embed.addField(field.name, field.value, false);
                // embed.addBlankField(true);
            });
        }
        else {
            embed.addField("No Games", "No games scheduled today :(", false);
        }
        callback(embed);

    });
}

//create an embed message to post in the channel
GetEmbedMessage = (title) => {
    return new Discord.RichEmbed()
        .setDescription(title)
        .setAuthor('hockeybot', 'https://cdn.discordapp.com/embed/avatars/0.png')
        .setColor(111111)
        .setTimestamp()
        .setThumbnail(bot_thumbnail_image)
        .setFooter("Source: NHL API", bot_footer_image);

};


/**
 * Create voice and text channels for each NHL game in categories: game_text_chat, game_voice_chat
 */
updateGameChannels = (guild) => {
    //delete all channels
    const category_channels = [];
    const categories = [
        {
            'name': 'game_text_chat',
            'type': 'text'
        }, {
            'name': 'game_voice_chat',
            'type': 'voice'
        }
    ];
    _.each(categories, (category) => {
        const category_channel = guild.channels.find('name', category.name);
        //find children of this channel
        if (category_channel) {
            const category_children = category_channel.children.array();
            category_children && _.each(category_children, (channel) => {
                channel.delete(['Game channel from yesterday']);
            });
        }

        category_channels.push({
            'channel': category_channel,
            'type': category.type
        });
    });
    //request games and create new channels;
    request({
            url: `${SCHEDULE_URL}`,
            json: true
        },
        (err, resp, data) => {
            //delete previous channels (by category)
            if (data && data.dates && data.dates[0] && data.dates[0].games) {
                _.each(data.dates[0].games, (game) => {
                    //for each category
                    _.each(category_channels, (category) => {
                        //create a game channel with the same type
                        guild.createChannel(`${GetTeamById(game.teams.away.team.id).abbreviation} at ${GetTeamById(game.teams.home.team.id).abbreviation}`, category.type).then((channel) => {
                            //and add it to the category
                            if (channel) {
                                channel.setParent(category.channel);
                            }
                        });
                    });
                });
            }
        }
    );
}
/**
 * Every day, post today's NHL games at
 */
const dailyScheduleTask = new cron.CronJob(
    cronDAILY,
    () => {
        _.each(client.guilds.array(), (guild) => {
            const hockeyChannel = guild.channels.find('name', 'nhl') || guild.channels.find('name', 'game-schedule') || guild.channels.find('name', 'kraken');
            hockeyChannel && createSchedule((embed) => {
                embed && hockeyChannel.send(embed);
            });
        });     

    },
    () => {
        console.log(`daily schedule job ended at ${new Date()}`);
    },
    true,
    "America/Los_Angeles"
);

const dailyChannelSetup = new cron.CronJob(
    cronDAILY,
    () => {
        _.each(client.guilds.array(), (guild) => {
            if(guild.name === "SeattleNHL") {
                updateGameChannels(guild);
            }            
        });   

    },
    () => {
        console.log(`daily channel job ended at ${new Date()}`);
    },
    true,
    "America/Los_Angeles"
);

const hourlyStandingsUpdate = new cron.CronJob(
    cronHOURLY,
    async () => {
        await GetStandings(updateStandings);
    },
    () => {
        if(DEBUG) {
            console.log(`hourly standings job ended at ${new Date()}`);
        }
    },
    true,
    "America/Los_Angeles",
    null,
    true
);


//MAIN
//check for bot token
if (!botToken || botToken == '') {
    console.log(`Please set an environment variable "bot_token" with your bot's token`);
}
else {
    //login and go
    client.login(botToken);
}

//stupid fix for azure app service containers requiring a response to port 8080
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('yeet');
  res.end();
}).listen(8080);
