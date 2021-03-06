var nodecg = require('./utils/nodecg-api-context').get();

/*var streamsReplicant = nodecg.Replicant('twitch-streams', {'persistent':false,'defaultValue':[
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
	{'channel':'speedrunslive','widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0,'quality':'chunked','volume':0.5,'paused':false,'hidden':true},
]});*/

//Twitch aspect ratio 1024x576

var runDataActiveRunReplicant = nodecg.Replicant("runDataActiveRun", 'nodecg-speedcontrol');

var streamsReplicant = nodecg.Replicant('twitch-streams', {'defaultValue':[]});
var soundOnTwitchStream = nodecg.Replicant('sound-on-twitch-stream', {defaultValue:-1});

const aspectRatioToCropping = {
	"16_9":{'widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0},
	"15_9":{'widthPercent':106.667,'heightPercent':100,'topPercent':0,'leftPercent':0},
	"4_3":{'widthPercent':133.333,'heightPercent':100,'topPercent':0,'leftPercent':0},
	"3_2":{'widthPercent':118.5255,'heightPercent':100,'topPercent':0,'leftPercent':0},
	"10_9":{'widthPercent':160,'heightPercent':100,'topPercent':0,'leftPercent':0},
};

streamsReplicant.once('change',()=>{
runDataActiveRunReplicant.on('change', (newVal, old) => {
	// don't reset on server restart
	if (!newVal || !old) return;

	// set the initial cropping based on the aspect ratio marked in the schedule
	var cropping = {'widthPercent':100,'heightPercent':100,'topPercent':0,'leftPercent':0};
	if (newVal.customData && newVal.customData.Layout) {
		cropping = aspectRatioToCropping[newVal.customData.Layout] || cropping;
	}
	
	// grab all runners
	var newStreams = []
	var idx = 0;
	newVal.teams.forEach(team => {
		team.players.forEach(player => {
			// in case the replicant changed, but this stream wasn't affected, don't reset cropping
			var current = {'channel':'speedrunslive','quality':'chunked','volume':1,'paused':false,'hidden':true};
			current.widthPercent = cropping.widthPercent;
			current.heightPercent = cropping.heightPercent;
			current.topPercent = cropping.topPercent;
			current.leftPercent = cropping.leftPercent;
			if (!player.social || !player.social.twitch) {
				nodecg.log.error(`Twitch name for player ${player.name} missing!`);
				current.paused = true;
				current.hidden = true;
			} else {
				var oldStream = streamsReplicant.value[idx];
				if (!oldStream || player.social.twitch != oldStream.channel){
					current.channel = player.social.twitch;
					current.hidden = false;
				} else {
					current = oldStream;
				}
			}
			newStreams.push(current);
			idx++;
		});
	});
	// hide/mute/stop all other streams
	// TODO refactor this to be dynamic in the layout
	for (var i = newStreams.length;i<4;i++) {
		newStreams.push({"paused":true, "hidden":true});
	}
	streamsReplicant.value = newStreams;
});
});