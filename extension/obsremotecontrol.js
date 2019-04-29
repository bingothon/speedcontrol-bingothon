'use strict';

// set up nodecg-obs
var nodecg = require('./utils/nodecg-api-context').get();
const {OBSUtility} = require('nodecg-utility-obs');
const obsutility = new OBSUtility(nodecg);

// next scenes replicants
var obsNextScenesRep = nodecg.Replicant('nextOBSScenes', {defaultValue:[]});
var obsNextScenesNumRep = nodecg.Replicant('nextOBSScenesNum', {defaultValue:0});
var obsDiscordAudioMuted = nodecg.Replicant('obsDiscordAudioMuted', {defaultValue:true});
var obsDiscordAudioLevel = nodecg.Replicant('obsDiscordAudioLevel', {defaultValue:50});
var obsDiscordAudioDelay = nodecg.Replicant('obsDiscordAudioDelay', {defaultValue:0});
var obsNodecgAudioMuted = nodecg.Replicant('obsNodecgAudioMuted', {defaultValue:true});
var obsNodecgAudioLevel = nodecg.Replicant('obsNodecgAudioLevel', {defaultValue:100});

var obsProgramScreenRep = nodecg.Replicant('obs:programScene');
var obsWebsocketRep = nodecg.Replicant('obs:websocket');

// current run replicant
const currentRunRep = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

// scene names from settings, if obs isn't defined this isn't going to work
if (!nodecg.bundleConfig.obs) {
    nodecg.log.error('No OBS properties defined in config, scene changes & audio WILL NOT work');
    return;
}
var discordAudioSource = nodecg.bundleConfig.obs.discordAudio;
var nodecgAudioSource = nodecg.bundleConfig.obs.nodecgAudio;

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

    // update replicant based on the value in OBS, then register change listener for replicant to send updates to OBS
    obsutility.send('GetMute',{source:discordAudioSource})
        .then(data => {
            obsDiscordAudioMuted.value = data.muted;
            obsDiscordAudioMuted.on('change',(newVal)=>{
                obsutility.send('SetMute',{source:discordAudioSource, mute:newVal})
                    .then(()=>{nodecg.log.info('discord muting set to '+newVal)})
                    .catch((err)=>nodecg.log.error('error setting discord mute', err));
            });
        })
        .catch(err => nodecg.log.error('error getting discord mute',err));
    
    
    obsutility.send('GetVolume',{source:discordAudioSource})
        .then(data => {
            obsDiscordAudioLevel.value = data.volume*100;
            obsDiscordAudioLevel.on('change',(newVal)=>{
                obsutility.send('SetVolume',{source:discordAudioSource, volume:newVal/100})
                    .then(()=>{nodecg.log.info('discord volume set to '+newVal)})
                    .catch((err)=>nodecg.log.error('error setting discord volume level',err));
            });
        })
        .catch(err => nodecg.log.error('error getting discord volume',err));
    
    obsutility.send('GetSyncOffset',{source:discordAudioSource})
        .then(data => {
            obsDiscordAudioDelay.value = data.offset/1000000;
            obsDiscordAudioDelay.on('change',newVal=>{                      // offset is in nanoseconds
                obsutility.send('SetSyncOffset', {source:discordAudioSource, offset:newVal*1000000})
                    .then(() => nodecg.log.info('discord audio delay set to '+newVal+'ms'))
                    .catch(err => nodecg.log.error('error setting discord audio delay',err));
            });
        })
        .catch(err => nodecg.log.error('error getting discord delay',err));

    obsutility.send('GetMute',{source:nodecgAudioSource})
        .then(data => {
            obsNodecgAudioMuted.value = data.muted;
            obsNodecgAudioMuted.on('change',(newVal)=>{
                obsutility.send('SetMute',{source:nodecgAudioSource, mute:newVal})
                    .then(()=>{nodecg.log.info('nodecg muting set to '+newVal)})
                    .catch((err)=>nodecg.log.error('error setting nodecg mute', err));
            });
        })
        .catch(err => nodecg.log.error('error getting nodecg mute',err));

    obsutility.send('GetVolume',{source:nodecgAudioSource})
        .then(data => {
            obsNodecgAudioLevel.value = data.volume*100;
            obsNodecgAudioLevel.on('change',(newVal)=>{
                obsutility.send('SetVolume',{source:nodecgAudioSource, volume:newVal/100})
                    .then(()=>{nodecg.log.info('nodecg volume set to '+newVal)})
                    .catch((err)=>nodecg.log.error('error setting nodecg volume level',err));
            });
        })
        .catch(err => nodecg.log.error('error getting nodecg volume level',err));
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