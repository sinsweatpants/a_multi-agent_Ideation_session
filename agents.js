/**
 * @file agents.js
 * Exports the agent objects loaded from the agents/ directory.
 * The orchestrator expects an object with specific names like
 * `allAgents`, `storyArchitectAgent`, `characterDevelopmentAgent`, etc.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Gemini REST endpoint used by agents when they run themselves.
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

// Helper to load the agent file as raw text (avoid executing broken JS in those files)
function loadAgentGuide(fileName) {
	try {
		const p = path.join(__dirname, 'agents', fileName);
		return fs.readFileSync(p, { encoding: 'utf8' });
	} catch (err) {
		console.error('Failed to load agent guide file:', fileName, err.message);
		return '';
	}
}

// Build an agent object that includes a `run(apiKey, taskPrompt)` method so each agent
// can perform its own LLM call. This keeps the orchestrator as a coordinator only.
function makeAgent(name, fileName) {
	const guide = loadAgentGuide(fileName);

	async function run(apiKey, taskPrompt) {
		const fullPrompt = `${guide}\n\n**Your Current Task:**\n${taskPrompt}`;
		try {
			const response = await axios.post(
				`${GEMINI_API_URL}?key=${apiKey}`,
				{
					contents: [{ parts: [{ text: fullPrompt }] }],
					generationConfig: {
						temperature: 0.7,
						topK: 1,
						topP: 1,
						maxOutputTokens: 2048,
					},
				},
				{ timeout: 90000 }
			);

			if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
				return response.data.candidates[0].content.parts[0].text;
			}
			throw new Error('Invalid response structure from Gemini API.');
		} catch (err) {
			const msg = err.response && err.response.data && err.response.data.error ? err.response.data.error.message : err.message;
			throw new Error(`Gemini API Error for ${name}: ${msg}`);
		}
	}

	return { name, guide, run };
}

const storyArchitectAgent = makeAgent('Story Architect Agent', 'storyArchitect.js');
const characterDevelopmentAgent = makeAgent('Character Development Agent', 'characterDevelopment.js');
const characterExpansionAgent = makeAgent('Character Expansion Agent', 'characterExpansion.js');
const conflictTensionAgent = makeAgent('Conflict & Tension Agent', 'conflictTension.js');
const dialogueVoiceAgent = makeAgent('Dialogue & Voice Agent', 'dialogueVoice.js');
const genreToneAgent = makeAgent('Genre & Tone Agent', 'genreTone.js');
const pacingAgent = makeAgent('Pacing Agent', 'pacing.js');
const realismCriticAgent = makeAgent('Realism Critic Agent', 'realismCritic.js');
const strategicAnalystAgent = makeAgent('Strategic Analyst Agent', 'strategicAnalyst.js');
const themeAgent = makeAgent('Theme Agent', 'theme.js');
const worldBuildingAgent = makeAgent('World-Building Agent', 'worldBuilding.js');

const allAgents = [
	storyArchitectAgent,
	characterDevelopmentAgent,
	characterExpansionAgent,
	conflictTensionAgent,
	dialogueVoiceAgent,
	genreToneAgent,
	pacingAgent,
	realismCriticAgent,
	strategicAnalystAgent,
	themeAgent,
	worldBuildingAgent,
];

module.exports = {
	allAgents,
	storyArchitectAgent,
	characterDevelopmentAgent,
	characterExpansionAgent,
	conflictTensionAgent,
	dialogueVoiceAgent,
	genreToneAgent,
	pacingAgent,
	realismCriticAgent,
	strategicAnalystAgent,
	themeAgent,
	worldBuildingAgent,
};