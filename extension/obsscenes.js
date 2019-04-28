module.exports = function(obsutility) {
    // next scenes replicants
    var nodecg = require('./utils/nodecg-api-context').get();
    var obsNextScenesRep = nodecg.Replicant('nextOBSScenes', {defaultValue:[]});
    var obsNextScenesNumRep = nodecg.Replicant('nextOBSScenesNum', {defaultValue:0});
    var obsDiscordAudioMuted = nodecg.Replicant('obsDiscordAudioMuted', {defaultValue:true});
    var obsDiscordAudioLevel = nodecg.Replicant('obsDiscordAudioLevel', {defaultValue:50});

    var obsProgramScreenRep = nodecg.Replicant('obs:programScene');
    var obsWebsocketRep = nodecg.Replicant('obs:websocket');

    // current run replicant
    const currentRunRep = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

    // scene names from settings
    var discordAudioSource = nodecg.bundleConfig.obs.discordAudio;

    var initialized = false;

    // definitions
    const bingoToScenes = {
        "default":["bingo","interview"],
        "draft":["interview","bingo","interview"],
    }

    function formatToSceneName(rawSceneName, playerCount, layout) {
        if (rawSceneName == "bingo") {
            return `${layout}-${playerCount}p-bingo`;
        } else if(rawSceneName == "interview") {
            return `interview-${playerCount}p`;
        }
    }

    //make sure obswebsocket is initialized before adding stuff depending on it
    obsWebsocketRep.on('change',newVal=>{
        if (initialized || newVal.status != "connected") return;
        initialized = true;

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

        // if a new run is played set scenes accordingly
        currentRunRep.on('change', newValue=>{
            // only update during the intermission scene, otherwise it's likely a server restart
            if (!obsProgramScreenRep.value || obsProgramScreenRep.value.name != "intermission") return;
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
        });
    
        // set the audio depending on the replicant
        obsDiscordAudioMuted.on('change',(newVal)=>{
            obsutility.send('SetMute',{source:discordAudioSource, mute:newVal})
                .then(()=>{nodecg.log.info('muting set to '+newVal)})
                .catch((err)=>nodecg.log.error('error setting mute', err));
        });
    
        // set the audio depending on the replicant
        obsDiscordAudioLevel.on('change',(newVal)=>{
            obsutility.send('SetVolume',{source:discordAudioSource, volume:newVal/100})
                .then(()=>{nodecg.log.info('volume set to '+newVal)})
                .catch((err)=>nodecg.log.error('error setting volume level',err));
        });

        // update replicant for changes, doesn't work for some reason
        /*obsutility.on('SourceVolumeChanged', data => {
            nodecg.log.info('changed source volue',data);
            if (data.sourceName == discordAudioSource) {
                if (obsDiscordAudioLevel.value != (data.volume * 100).toPrecision(1)) {
                    obsDiscordAudioLevel.value = data.volume * 100;
                }
            }
        });

        obsutility.on('SourceMuteStateChanged', data => {
            if (data.sourceName == discordAudioSource) {
                if (obsDiscordAudioMuted.value != data.muted) {
                    obsDiscordAudioMuted.value = data.muted;
                }
            }
        });*/
    });
}