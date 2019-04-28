'use strict';
$(()=>{
    // replicants
    const bingothonBundleName = 'speedcontrol-bingothon';
    var obsSceneListRep = nodecg.Replicant('obs:sceneList', bingothonBundleName);
    var obsProgramScreenRep = nodecg.Replicant('obs:programScene', bingothonBundleName);
    var obsWebsocketRep = nodecg.Replicant('obs:websocket', bingothonBundleName);
    var obsPreviewScreenRep = nodecg.Replicant('obs:previewScene', bingothonBundleName);
    var obsStudioModeRep = nodecg.Replicant('obs:studioMode', bingothonBundleName);
    var obsNextScenesRep = nodecg.Replicant('nextOBSScenes', bingothonBundleName, {defaultValue:[]});
    var obsNextScenesNumRep = nodecg.Replicant('nextOBSScenesNum', bingothonBundleName, {defaultValue:0});
    var obsDiscordAudioMuted = nodecg.Replicant('obsDiscordAudioMuted', {defaultValue:true});
    var obsDiscordAudioLevel = nodecg.Replicant('obsDiscordAudioLevel', {defaultValue:50});
    // selectors
    var $mainControl = $('#obs-control');
    var $errorBox = $('#error-box');
    var $nextSceneSelect = $('select#obs-preview-scene');
    var $currentScene = $('#obs-current-scene');
    var $transButton = $('#trans-button');
    var $discordMuteButton = $('#discord-mute');
    var $discordAudioSlider = $('#discord-volume');

    // util functions
    function showError(text) {
        $mainControl.hide();
        $errorBox.show();
        $errorBox.text(text);
    }

    function showControl() {
        $mainControl.show();
        $errorBox.hide();
    }

    obsWebsocketRep.on('change', (newVal, oldVal)=>{
        if(!newVal || (oldVal && newVal.status == oldVal.status)) {
            return;
        }
        // only show control if connected
        if (newVal.status != 'connected') {
            showError("Not connected to obs!");
        } else if (obsStudioModeRep.value) {
            showControl();
        } else {
            showError('Not in studio mode!');
        }
    });

    // Forward replicant changes to ui
    obsStudioModeRep.on('change', newVal=>{
        if (newVal) {
            showControl();
        } else {
            showError('Not in studio mode!');
        }
    });

    obsSceneListRep.on('change', newVal=>{
        if(!newVal) return;
        $nextSceneSelect.html(newVal.map(scene=>`<option value="${scene}">${scene}</option>`));
        // make sure to update value when scenes are ready
        obsPreviewScreenRep.on('change', newVal=>{
            if(!newVal) return;
            $nextSceneSelect.val(newVal.name);
        });
    });

    obsProgramScreenRep.on('change', newVal=>{
        if(!newVal) return;
        $currentScene.text(newVal.name);
    });

    // Forward user interaction to OBS
    $nextSceneSelect.on('change', function() {
        var nextScene = this.value;
        nodecg.sendMessage('obs:previewScene', nextScene).catch(err=>{
            nodecg.log.error(`Failed to change previewScene to ${nextScene}`,err);
        });
    });

    $transButton.on('click',function() {
        nodecg.sendMessage('obs:transition').then(()=>{
            // transition completed, change preview scene to next one in the list, if there is any
            // after transition is completed (has a transition effect)
            setTimeout(()=>{ obsNextScenesNumRep.value++;}, 4000);
        }).catch(err => {
            nodecg.log.error('failed to start transition', err);
        });
    });

    // handle discord mute
    $discordMuteButton.on('click', ()=>{
        obsDiscordAudioMuted.value = !obsDiscordAudioMuted.value;
    })

    obsDiscordAudioMuted.on('change', newVal => {
        $discordMuteButton.text(newVal?"Unmute":"Mute");
    });

    // handle discord audio volume
    $discordAudioSlider.on('change', event=>{
        obsDiscordAudioLevel.value = parseInt(event.target.value);
    });

    obsDiscordAudioLevel.on('change', newVal => {
        $discordAudioSlider.val(newVal);
    });

    /** Consumes the message that suggests the next Scenes, unused atm
     *
    nodecg.listenFor('obsSceneSwitchSuggestion', (params, callback)=>{
        obsNextScenesRep.value.scenes = params;
        obsNextScenesRep.value.nextSceneNum = 0;
        callback();
    });*/
});