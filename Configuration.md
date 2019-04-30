# Configuration

```
{
	"twitch": {
		"enable": true,
		"chatBot": false
	},
	"discord":{
		"token": "YOUR_DISCORD_BOT_TOKEN",
		"serverID": "ID of your discord server",
		"commandChannelID": "text channel where the bot is operated from on the discord server",
		"voiceChannelID": "voice channel the bot joins to display voice activity",
		"test":true
					
	},
	"donationtracker": {
		"url":"https://devdonations.bingothon.com",
		"enable":false,
		"eventSlug":"bingothon18"
	},
	"obs":{
		"discordAudio":"Source for discord audio",
		"nodecgAudio":"Source for nodecg audio, desktop monitor"
	}
	"esaRepeaterPostKey":"DEFAULT_KEY"
}
```

## nodecg-speedcontrol configuration
Follow the instruction there, however choosing the correct, next layouts requires 2 custom columns under the schedule import: "Bingotype" and "Layout", bingotype is used to determine the order of scenes and layout is used to load the scenes like `{Layout, _ replaced with x} - {playercount} player layout`, `Interview - {playercount} player layout`

## OBS config
Choose the names of the sources, the discord Audio is picked up from, this is seperated from the normal desktop audio (named nodecgAudio in the config) to make it possible to seperate them