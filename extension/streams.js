var nodecg = require('./utils/nodecg-api-context').get();

/*var streamsReplicant = nodecg.Replicant('twitch-streams', {'persistent':false,'defaultValue':[
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
]});*/
var runDataActiveRunReplicant = nodecg.Replicant("runDataActiveRun", 'nodecg-speedcontrol');

var streamsReplicant = nodecg.Replicant('twitch-streams', {'persistent':false, 'defaultValue':[]});

runDataActiveRunReplicant.on('change', newVal => {
	if (!newVal) return;
	
	// grab all runners
	var index = 0;
	newVal.teams.forEach(team => {
		team.players.forEach(player => {
                    streamsReplicant.value[index] = {'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true};
			if (!player.social || !player.social.twitch) {
				nodecg.log.error('Twitch name for player '+index+' missing!');
				streamsReplicant.value[index].paused = true;
				streamsReplicant.value[index].hidden = true;
			} else {
				streamsReplicant.value[index].channel = player.social.twitch;
				streamsReplicant.value[index].hidden = false;
			}
			index++;
		});
	});
	index++;
	// hide/mute/stop all other streams
	while (index < 4) {
		streamsReplicant.value[index].paused = true;
		streamsReplicant.value[index].hidden = true;
		index++;
	}
});