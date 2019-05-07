'use strict';

// set up nodecg-obs
var nodecg = require('./utils/nodecg-api-context').get();
const {OBSUtility} = require('nodecg-utility-obs');
const obsutility = new OBSUtility(nodecg);

// next scenes replicants
const obsNextScenesRep = nodecg.Replicant('nextOBSScenes', {defaultValue:[]});
const obsNextScenesNumRep = nodecg.Replicant('nextOBSScenesNum', {defaultValue:0});
const obsDiscordAudioMuted = nodecg.Replicant('obsDiscordAudioMuted', {defaultValue:true});
const obsDiscordAudioLevel = nodecg.Replicant('obsDiscordAudioLevel', {defaultValue:50});
const obsDiscordAudioDelay = nodecg.Replicant('obsDiscordAudioDelay', {defaultValue:0});
const obsNodecgAudioMuted = nodecg.Replicant('obsNodecgAudioMuted', {defaultValue:true});
const obsNodecgAudioLevel = nodecg.Replicant('obsNodecgAudioLevel', {defaultValue:100});
// delay in ms
const voiceDelayRep = nodecg.Replicant('voiceDelay', {defaultValue: 0, persistent: true});
const soundOnTwitchStream = nodecg.Replicant('sound-on-twitch-stream', {defaultValue:-1});
const streamDelay = nodecg.Replicant('stream-delay',{'defaultValue':[0,0,0,0], 'persistent':false});
// this value indicates the current "mode" a few things have to be set in;
// There are 3 different modes depending on who provides the audio:
// 1. external commentary, the racers are not in the call, that means no delay for the voice
// 2. racer commentary but we capture discord audio, audio needs to be delayed by stream delay, but we can handle audio balance
// 3. racers stream all audio, only delay the discord display and mute our discord audio capture, problematic with interview
const obsStreamMode = nodecg.Replicant('obsStreamMode', {defaultValue:"external-commentary"});// external-commentary,racer-commentary or racer-audio-only

const obsProgramScreenRep = nodecg.Replicant('obs:programScene');
const obsPreviewScreenRep = nodecg.Replicant('obs:previewScene');
const obsWebsocketRep = nodecg.Replicant('obs:websocket');

// current run replicant
const currentRunRep = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');

const EXTERNAL_COMMENTARY = 'external-commentary';
const RUNNER_COMMENTARY = 'runner-commentary';
const RACER_AUDIO_ONLY = 'racer-audio-only';

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
        return `${layout.replace('_','x')} - ${playerCount} player layout`;
    } else if(rawSceneName == "interview") {
        return `Interview - ${playerCount} player layout`;
    }
}

//make sure obswebsocket is initialized before adding stuff depending on it
obsWebsocketRep.on('change',newVal=>{
    if (initialized || newVal.status != "connected") return;
    initialized = true;

    obsProgramScreenRep.once('change', newVal=>{
    obsPreviewScreenRep.once('change', newVal=>{

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
        if (!obsProgramScreenRep.value || !obsProgramScreenRep.value.name.startsWith("Intermission")) return;
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
            scenes.push("Intermission (ads)");// help ESA!
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
    
    // handle both stream mode and scene change
    function handleScreenStreamModeChange(streamMode, nextScene) {
        // depending on the next scene and which mode is used set some stuff automagically
        if (streamMode == EXTERNAL_COMMENTARY || streamMode == RUNNER_COMMENTARY) {
            // if commentary is external no delay is necessary
            if (obsStreamMode.value == EXTERNAL_COMMENTARY) {
                obsDiscordAudioDelay.value = 0;
                voiceDelayRep.value = 0;
            }
            // if going to a game screen, unmute the game, otherwise mute
            if (nextScene.includes('x')) {
                soundOnTwitchStream.value = 0;
            } else {
                soundOnTwitchStream.value = -1;
            }
            // if the next scene isn't intermission unmute discord
            if (nextScene.includes('Intermission')) {
                obsDiscordAudioMuted.value = true;
            } else {
                obsDiscordAudioMuted.value = false;
            }
        } else if(streamMode == RACER_AUDIO_ONLY) {
            // use player audio
            if (nextScene.includes('x')) {
                soundOnTwitchStream.value = 0;
            } else {
                soundOnTwitchStream.value = -1;
            }
            // discord muted exept for interview
            if (nextScene.includes('Interview')) {
                obsDiscordAudioMuted.value = false;
            } else {
                obsDiscordAudioMuted.value = true;
            }
        } else {
            nodecg.log.error('Unknown stream configuration: '+streamMode);
        }
    }

    // catches the event when the user triggers the switch to the next scene
    nodecg.listenFor('obsTransitionToNextScene',()=>{

        var nextScene = obsPreviewScreenRep.value.name;
        // prepare for next scene
        handleScreenStreamModeChange(obsStreamMode.value, nextScene);

        nodecg.sendMessage('obs:transition');
        // transition completed, change preview scene to next one in the list, if there is any
        // after transition is completed (has a transition effect)
        setTimeout(()=>{ obsNextScenesNumRep.value++;}, 4000);
    });

    obsStreamMode.on('change', newVal=>{
        // change in current scene
        handleScreenStreamModeChange(newVal, obsProgramScreenRep.value.name);
    });

    streamDelay.on('change',newVal=>{
        if (obsStreamMode.value != EXTERNAL_COMMENTARY) {
            // if it's not external commentary figure out delay, if it's not a significant change (<2sek) don't update
            var leadStreamDelay = newVal[soundOnTwitchStream.value];
            if (Math.abs(leadStreamDelay*1000 - voiceDelayRep.value) > 2000) {
                // delay display and discord (even if it's muted most of the time)
                voiceDelayRep.value = leadStreamDelay * 1000;
                obsDiscordAudioDelay.value = leadStreamDelay * 1000;
            }
        }
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
    });
});