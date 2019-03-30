# speedcontrol-bingothon

## OBSControl
Panel to control OBS scene switches. Only active when OBS websocket is connected.

To save tech some time when a run is started the (most likely) series of next scenes is loaded with the `obsSceneSwitchSuggestion` message, containing the array of scenes as a parameter and then stored into a replicant `nextOBSScenes`. So when the scene is switched via OBSControl the preview scene is already set to the next one is the previously defined list, the last one is probably intermission again and then the cycle continues.