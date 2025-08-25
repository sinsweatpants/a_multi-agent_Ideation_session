const storyArchitectAgent = require('./storyArchitect');
const realismCriticAgent = require('./realismCritic');
const strategicAnalystAgent = require('./strategicAnalyst');
const characterDevelopmentAgent = require('./characterDevelopment');
const characterExpansionAgent = require('./characterExpansion');
const worldBuildingAgent = require('./worldBuilding');
const dialogueVoiceAgent = require('./dialogueVoice');
const themeAgent = require('./theme');
const genreToneAgent = require('./genreTone');
const pacingAgent = require('./pacing');
const conflictTensionAgent = require('./conflictTension');

const allAgents = [
    storyArchitectAgent,
    realismCriticAgent,
    strategicAnalystAgent,
    characterDevelopmentAgent,
    characterExpansionAgent,
    worldBuildingAgent,
    dialogueVoiceAgent,
    themeAgent,
    genreToneAgent,
    pacingAgent,
    conflictTensionAgent,
];

module.exports = {
    allAgents,
    storyArchitectAgent,
    characterDevelopmentAgent,
    realismCriticAgent,
    strategicAnalystAgent,
    characterExpansionAgent,
    worldBuildingAgent,
    dialogueVoiceAgent,
    themeAgent,
    genreToneAgent,
    pacingAgent,
    conflictTensionAgent,
};
