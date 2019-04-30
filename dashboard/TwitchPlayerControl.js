'use-strict'
$(()=>{
    // keeps track of which channel has sound, cause only one at a time can have sound, -1 is all muted
    var soundOnTwitchStream = nodecg.Replicant('sound-on-twitch-stream', {defaultValue:-1});
    // main control panel for streams
    var streams = nodecg.Replicant('twitch-streams');
    // stores all quality options available
    const streamQualities = nodecg.Replicant('stream-qualities', {'defaultValue':[[],[],[],[]]});
    const streamDelay = nodecg.Replicant('stream-delay',{'defaultValue':[0,0,0,0], 'persistent':false});

    const delayDisplays = $('.delay-display');

    const $discordDelay = $('#discord-delay');
    const voiceDelayRep = nodecg.Replicant('voiceDelay', {defaultValue: 0, persistent: true});

    // handle muting/unmuting
    $('.stream-mute').click((elem)=> {
        // find out which stream was meant to be muted/unmuted
        const streamID = elem.target.parentElement.id;
        const streamNr = parseInt(streamID[streamID.length - 1]);
        if (soundOnTwitchStream.value == streamNr) {
            soundOnTwitchStream.value = -1;
        } else {
            soundOnTwitchStream.value = streamNr;
        }
    });

    soundOnTwitchStream.on('change', (newValue, old)=> {
        for (var i = 0;i < 4;i++) {
            $('#stream-control'+i).find('.stream-mute').text(i==newValue ? 'Mute':'Unmute');
        }
    });

    // handle refresh
    $('.stream-refresh').click((elem)=> {
        // find out which stream was meant to be refreshed
        const streamID = elem.target.parentElement.id;
        const streamNr = parseInt(streamID[streamID.length - 1]);
        nodecg.log.info('refreshing stream '+streamNr);
        nodecg.sendMessage('refreshStream',(streamNr));
    });

    // handle play/pause
    $('.stream-pause').click((elem)=> {
        // find out which stream was meant to be refreshed
        const streamID = elem.target.parentElement.id;
        const streamNr = parseInt(streamID[streamID.length - 1]);
        if (streams.value[streamNr].paused) {
            nodecg.log.info('started stream '+streamNr);
            streams.value[streamNr].paused = false;
        } else {
            nodecg.log.info('stopped stream '+streamNr);
            streams.value[streamNr].paused = true;
        }
    });

    // handle external changes
    streams.on('change', (newStreams, old) => {
        for (var i in newStreams) {
            const stream = newStreams[i];
            const controlContainer = $('#stream-control'+i);
            // update pause/play text
            controlContainer.find('.stream-pause').text(stream.paused?'Play':'Pause');
            // set volume slider to right value
            controlContainer.find('.stream-volume').val(stream.volume * 100);
        }
    });

    streamQualities.on('change', (newQualities, oldQualities) => {
        newQualities.forEach((value, index)=>{
            // if the size is the same probably nothing has changed
            if (oldQualities && value.length == oldQualities[index].length) {
                return;
            }
            let optionsHtml = '';
            value.forEach((quality)=>{
                optionsHtml += '<option value="'+quality.group+'">'+quality.group+'</option>';
            });
            const qualSelect = $('#stream-control'+index).find('.quality-select');
            qualSelect.html(optionsHtml);
            qualSelect.val(streams.value[index].quality);
        })
    });

    streamDelay.on('change',(newVals)=>{
        delayDisplays.each((index, element)=>{
            $(element).html(newVals[index]);
        });
    });

    $('.quality-select').on('change', (elem)=>{
        const streamID = elem.target.parentElement.id;
        const streamNr = parseInt(streamID[streamID.length - 1]);
        streams.value[streamNr].quality = elem.target.value;
        nodecg.log.info('Updated quality to '+elem.target.value);
    });

    $('.stream-volume').on('input', (elem) => {
        const streamID = elem.target.parentElement.parentElement.id;
        const streamNr = parseInt(streamID[streamID.length - 1]);
        streams.value[streamNr].volume = parseInt(elem.target.value)/100;
    });

    $discordDelay.on('change', ()=>{
        voiceDelayRep.value = parseInt($discordDelay.val());
    });

    voiceDelayRep.on('change', (newVal)=>{
        $discordDelay.val(newVal);
    })
});