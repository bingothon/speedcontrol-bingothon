var nodecg = require('./utils/nodecg-api-context').get();

var finishFlags = nodecg.Replicant('finishFlags', {defaultValue:[{hasFinished: false, finishTime: '', finishMedal: ''},{hasFinished: false, finishTime: '', finishMedal: ''},{hasFinished: false, finishTime: '', finishMedal: ''},{hasFinished: false, finishTime: '', finishMedal: ''},]});
var stopWatchReplicant = nodecg.Replicant('timer', 'nodecg-speedcontrol');
var runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

function finishFlagForIndex(index) {
	// count finishers to set medal
	var finishers = 0;
	for(var i=0;i<finishFlags.value.length;i++) {
		if (finishFlags.value[i].hasFinished) {
			finishers++;
		}
	}
	if (finishers < 3) {
		finishFlags.value[index].finishMedal = finishers + 1;
	} else {
		finishFlags.value[index].finishMedal = null;
	}
	finishFlags.value[index].finishTime = stopWatchReplicant.value.time;
	finishFlags.value[index].hasFinished = true;
}

function unfinishFlagForIndex(index) {
	finishFlags.value[index].hasFinished = false;
}

function unfinishAllFlags() {
	for(var i=0;i<4;i++) {
		unfinishFlagForIndex(i);
	}
}

stopWatchReplicant.on('change', (newVal, oldVal) => {
	// Timer just reset
	if (oldVal && oldVal.state !== 'stopped' && newVal.state === 'stopped') {
		unfinishAllFlags();
	}

	if (!runDataActiveRun.value) return;
	var teams = runDataActiveRun.value.teams;
	teams.forEach((team, index) => {
		var team = teams[index];

		// Team Finished
		if (newVal.teamFinishTimes[team.id] && (!oldVal || !oldVal.teamFinishTimes[team.id])) {
			if (index == 1 && runDataActiveRun.value.teams[0].players.length == 2) {
				finishFlagForIndex(2);
			} else {
				finishFlagForIndex(index);
			}
		}

		// Team Unfinished
		else if (oldVal && oldVal.teamFinishTimes[team.id] && !newVal.teamFinishTimes[team.id]) {
			if (index == 1 && runDataActiveRun.value.teams[0].players.length == 2) {
				unfinishFlagForIndex(2);
			} else {
				unfinishFlagForIndex(index);
			}
		}
	});
});