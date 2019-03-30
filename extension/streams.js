var nodecg = require('./utils/nodecg-api-context').get();

/*var streamsReplicant = nodecg.Replicant('twitch-streams', {'persistent':false,'defaultValue':[
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
]});*/
var runDataActiveRunReplicant = nodecg.Replicant("runDataActiveRun", 'nodecg-speedcontrol');

var streamsReplicant = nodecg.Replicant('twitch-streams', {'defaultValue':[]});

runDataActiveRunReplicant.on('change', newVal => {
	if (!newVal) return;
	
	// grab all runners
	var newStreams = []
	newVal.teams.forEach(team => {
		team.players.forEach(player => {
			var current = {'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true};
			if (!player.social || !player.social.twitch) {
				nodecg.log.error(`Twitch name for player ${player.name} missing!`);
				current.paused = true;
				current.hidden = true;
			} else {
				current.channel = player.social.twitch;
				current.hidden = false;
			}
			newStreams.push(current);
		});
	});
	// hide/mute/stop all other streams
	// TODO refactor this to be dynamic in the layout
	for (var i = newStreams.length;i<4;i++) {
		newStreams.push({"paused":true, "hidden":true});
	}
	streamsReplicant.value = newStreams;
});