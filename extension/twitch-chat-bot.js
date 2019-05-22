'use-strict'

var TwitchJS = require('twitch-js');
const bingoDefinitions = require('./bingodefinitions');

var nodecg = require('./utils/nodecg-api-context').get();

// Map<str, {response:bla, enabled:true, cooldown:0, lastUsed:123456}>
var chatCommandsRep = nodecg.Replicant('chatCommands', {defaultValue: {}});

// keep track of cooldowns
var cooldowns = {runner:{lastUsed:0, cooldown:15}, bingo:{lastUsed:0, cooldown:15}};
// in case the cooldowns need to be adjusted
nodecg.listenFor('setCommandCooldown',data=>{
    if (!data || !data.command || !data.cooldown) {
        nodecg.log.error("can't set cooldown if command and/or cooldown are missing, got:",data);
    } else {
        var com = cooldowns[data.command];
        if (com) {
            com.cooldown = data.cooldown;
        }
    }
})

// Setting up replicants.
var accessToken = nodecg.Replicant('twitchAccessToken', 'nodecg-speedcontrol');
var twitchChannelNameRep = nodecg.Replicant('twitchChannelName', 'nodecg-speedcontrol');
var runDataActiveRunRep = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

if (nodecg.bundleConfig && nodecg.bundleConfig.twitch && nodecg.bundleConfig.twitch.enable && nodecg.bundleConfig.twitch.chatBot) {
    nodecg.listenFor('twitchAPIReady', 'nodecg-speedcontrol', () => {
        nodecg.log.info("Twitch chat bot is enabled.");

        var options = {
            options: {
                //debug: true,  // might want to turn off when in production
            },
            connection: {
                secure: true,
                reconnect: true,
            },
            identity: {
                username: twitchChannelNameRep.value,
                password: accessToken.value,
            }
        };

        var client = new TwitchJS.client(options);
        
        // message handler function
        function messageHandler(channel, user, message, self) {
            // only listen to commands in chat
            if (self) return;
            if (user['message-type'] != 'chat') return;
            if (!message.startsWith('!')) return;
            var parts = message.split(' ', 3);
            // check mod only commands, currently not used
            /*if ((user.mod || 'broadcaster' in user.badges) && parts.length >= 2) {
                // name of the command to edit
                var commandname = parts[1];
                if (parts.length == 2) {
                    if (parts[0]=='!delcmd') {
                        if (chatCommandsRep.value.hasOwnProperty(commandname)) {
                            delete chatCommandsRep.value[commandname];
                            client.say(channel, `Command ${commandname} successfully deleted!`);
                        } else {
                            client.say(channel, `Command ${commandname} doesn't exist!`);
                        }
                    }
                } else {
                    if (parts[0]=='!addcmd') {
                        if (chatCommandsRep.value.hasOwnProperty(commandname)) {
                            client.say(channel, `Command ${commandname} already exists!`);
                        } else {
                            chatCommandsRep.value[commandname] = {response: parts[2], enabled: true, cooldown: 5, lastUsed: 0};
                            client.say(channel, `Command ${commandname} successfully added!`);
                        }
                    }
                    if (parts[0]=='!setcmd') {
                        if (chatCommandsRep.value.hasOwnProperty(commandname)) {
                            chatCommandsRep.value[commandname].response = parts[2];
                            client.say(channel, `Command ${commandname} successfully changed!`);
                        } else {
                            client.say(channel, `Command ${commandname} doesn't exist!`);
                        }
                    }
                    if (parts[0]=='!setcmdenabled') {
                        if (chatCommandsRep.value.hasOwnProperty(commandname)) {
                            chatCommandsRep.value[commandname].enabled = !!parts[2];
                            client.say(channel, `Command ${commandname} successfully enabled/disabled!`);
                        } else {
                            client.say(channel, `Command ${commandname} doesn't exist!`);
                        }
                    }
                    if (parts[0]=='!setcmdcooldown') {
                        if (chatCommandsRep.value.hasOwnProperty(commandname)) {
                            var cd = parseInt(parts[2]);
                            if (isNaN(cd)) {
                                client.say(channel, `${parts[2]} is not a number!`);
                            } else {
                                chatCommandsRep.value[commandname].cooldown = cd;
                                client.say(channel, `Command ${commandname} successfully changed!`);
                            }
                        } else {
                            client.say(channel, `Command ${commandname} doesn't exist!`);
                        }
                    }
                }
            }*/
            var userCommandName = parts[0].slice(1);
            var now = new Date().getTime();
            if (userCommandName == "runner" || userCommandName == "runners" || userCommandName == "r") {
                // check cooldown to not spam chat
                if (now - cooldowns.runner.lastUsed < cooldowns.runner.cooldown) {
                    return;
                }
                cooldowns.runner.lastUsed = now;
                // Grab current runners and format them & their twitch
		var playerCount = 1;
                var runersStr = runDataActiveRunRep.value.teams.flatMap(t => t.players).map(p => `Player ${playerCount++}: ${p.name} ( twitch.tv/${p.social.twitch} )`).join('. ');
                if (runersStr) {
                    client.say(channel, 'Follow the runners! '+runersStr)
                        .catch(e=>nodecg.log.error('',e));
                }
                return;
            }
            if (userCommandName == "bingo") {
                // check cooldown to not spam chat
                if (now - cooldowns.bingo.lastUsed < cooldowns.bingo.cooldown) {
                    return;
                }
                cooldowns.bingo.lastUsed = now;
                if (runDataActiveRunRep.value && runDataActiveRunRep.value.customData) {
                    var bingotype = runDataActiveRunRep.value.customData.Bingotype;
                    if (bingotype) {
                        var isCoop = runDataActiveRunRep.value.teams[0].players.length > 1;
                        var explanation = bingoDefinitions[bingotype];
                        if (explanation) {
                            if (isCoop) {
                                explanation += bingoDefinitions.coop;
                            }
                            client.say(channel, explanation)
                                .catch(e=>nodecg.log.error('',e));
                        }
                    }
                }
            }
            /* also custom chatbot stuff not used
            if (chatCommandsRep.value.hasOwnProperty(userCommandName)) {
                var userCommand = chatCommandsRep.value[userCommandName];
                if (userCommand &&
                    userCommand.enabled &&
                    (new Date().getTime() - userCommand.lastUsed) > userCommand.cooldown) {
                        client.say(channel, userCommand.response);
                        userCommand.lastUsed = new Date().getTime();
                }
            }*/
        }
        client.connect()
            .catch(e=>nodecg.log.error('',e))
            .then(()=>{
                client.on('message', messageHandler);
                client.join(twitchChannelNameRep.value)
                    .catch(reason => {
                        nodecg.log.error("Couldn't join channel: "+reason);
                    }).then(data=>{
                        nodecg.log.info("Joined channel: "+data);
                    });
            });
    });
}
