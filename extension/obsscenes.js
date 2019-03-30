var nodecg = require('./utils/nodecg-api-context').get();

// next scenes replicants
var obsNextScenesRep = nodecg.Replicant('nextOBSScenes', {defaultValue:[]});
var obsNextScenesNumRep = nodecg.Replicant('nextOBSScenesNum', {defaultValue:0});

var obsProgramScreenRep = nodecg.Replicant('obs:programScene');
var obsWebsocketRep = nodecg.Replicant('obs:websocket');

// current run replicant
const currentRunRep = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

var initialized = false;

//make sure obswebsocket is initialized
obsWebsocketRep.on('change',newVal=>{
    if (initialized || newVal.status != "connected") return;
    obsNextScenesNumRep.on('change',(newVal)=>{
        var nextPreviewScene = obsNextScenesRep.value[newVal];
        if (nextPreviewScene) {
            nodecg.log.info(`to ${nextPreviewScene}`);
            nodecg.sendMessage('obs:previewScene', nextPreviewScene, err => {
                if (err) {
                    nodecg.log.error(`Failed to change previewScene to ${nextPreviewScene} as noted in scene list`,err);
                }
            });
        }
    });
    initialized = true;
});


// definitions
const bingoToScenes = {
    "default":["bingo","interview"],
    "draft":["interview","bingo","interview"],
}

function formatToSceneName(rawSceneName, playerCount, layout) {
    if (rawSceneName == "bingo") {
        return `${layout}-${playerCount}P-BINGO`;
    } else if(rawSceneName == "interview") {
        return `INTERVIEW-${playerCount}P`;
    }
}

// if a new run is played set scenes accordingly
currentRunRep.on('change', newValue=>{
    // only update during the intermission scene, otherwise it's likely a server restart
    if (obsProgramScreenRep.value.name != "intermission") return;
    // safety check
    if (newValue.customData && newValue.customData.Layout && newValue.customData.Bingotype) {
        var bingotype = newValue.customData.Bingotype;
        var layout = newValue.customData.Layout;
        // select scenes based on type, or default
        var rawScenes = bingoToScenes[bingotype];
        if (!rawScenes) {
            rawScenes = bingoToScenes["default"];
        }
        var playerCount = newValue.teams.flatMap(team => team.players).length;
        var scenes = rawScenes.map(scene => formatToSceneName(scene, playerCount, layout));
        scenes.push("intermission");
        obsNextScenesRep.value = scenes;
        // trigger preview switch
        obsNextScenesNumRep.value = -1;
        obsNextScenesNumRep.value = 0;
        nodecg.log.info("set next scenes for OBS");
	}
})