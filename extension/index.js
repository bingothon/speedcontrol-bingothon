'use strict';

// Referencing other files.
var nodecgAPIContext = require('./utils/nodecg-api-context');

module.exports = function(nodecg) {
	// Store a reference to this NodeCG API context in a place where other libs can easily access it.
	// This must be done before any other files are `require`d.
	nodecgAPIContext.set(nodecg);

	// set up Replicants here so they don't have to be declared multiple times
	nodecg.Replicant('bingo-colors', {'persistent':false,'defaultValue':[]});

	// Other extension files we need to load.
	require('./bingosync');
	require('./gdq-donationtracker');
	require('./twitch-chat-bot');
	require('./streams');
	require('./finish-flags');
	require('./obsremotecontrol');
	
	// nodecg-speedcontrol no longer sends forceRefreshIntermission so doing it here instead
	var stopWatchReplicant = nodecg.Replicant('timer', 'nodecg-speedcontrol');
	stopWatchReplicant.on('change', (newVal, oldVal) => {
		// Timer just finished
		if (oldVal && oldVal.state !== 'finished' && newVal.state === 'finished') {
			nodecg.sendMessage('forceRefreshIntermission');
		}
	});

	if (nodecg.bundleConfig.discord) {
		if (!nodecg.bundleConfig.discord.test) {
			require('./discord');
		} else {
			const voiceActivity = nodecg.Replicant('voiceActivity', {
				defaultValue: {
					members: []
				}, persistent: true
			});
			const defaultAvatar = 'https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png';
			voiceActivity.value = {'members':[
				{id: 0, name: 'abc', avatar: defaultAvatar, isSpeaking: false},
				{id: 1, name: 'testlongname', avatar: defaultAvatar, isSpeaking: true},
				{id: 2, name: 'anotherone', avatar: defaultAvatar, isSpeaking: true},
				{id: 3, name: 'POGGERS', avatar: defaultAvatar, isSpeaking: false},
			]};
		}
	}

	// POSTs FFZ featured channels changes to the repeater server.
	var repeaterURL = 'https://repeater.esamarathon.com';
	var request = require('request-promise').defaults({jar: true}); // Automatically saves and re-uses cookies.
	var postKey = nodecg.bundleConfig.esaRepeaterPostKey || 'DEFAULT_KEY';
	if (postKey && postKey !== 'DEFAULT_KEY') {
		nodecg.listenFor('updateFFZFollowing', 'nodecg-speedcontrol', (usernames) => {
			request.post({
				url: repeaterURL+'/featured_channels?key='+postKey,
				body: JSON.stringify({
					channels: usernames
				}),
				headers: {'Content-Type': 'application/json; charset=utf-8'}
			}).then(() => {
				nodecg.log.info('Successfully sent featured channels to repeater server.');
			}).catch(err => {
				nodecg.log.warn('Failed to send featured channels to repeater server.');
			});
		});
	}
}