/**
 * @file orchestrator.js
 * This file is the heart of the multi-agent system. It acts as the "Master Orchestrator,"
 * managing the entire story development workflow from start to finish. It calls upon the
 * various expert agents to perform tasks and synthesizes their outputs into a final report.
 */

const axios = require('axios');
const { allAgents, storyArchitectAgent, characterDevelopmentAgent } = require('./agents');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

/**
 * A helper function to communicate with the Gemini API, acting on behalf of a specific agent.
 * @param {string} apiKey - The user's Gemini API key.
 * @param {object} agent - The agent object, containing its guide.
 * @param {string} taskPrompt - The specific task for the agent to perform.
 * @returns {Promise<string>} A promise that resolves to the text content of the API response.
 * @throws {Error} Throws an error if the API call fails.
 */
async function callAgent(apiKey, agent, taskPrompt) {
    // If the agent exposes a run method, let it perform its own LLM call. This keeps
    // the orchestrator as a pure coordinator. Otherwise fall back to the in-file
    // HTTP call behavior for backwards compatibility.
    if (agent && typeof agent.run === 'function') {
        return agent.run(apiKey, taskPrompt);
    }

    // Fallback: the orchestrator does the LLM call itself using the agent.guide.
    const fullPrompt = `${agent.guide}\n\n**Your Current Task:**\n${taskPrompt}`;
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
            { timeout: 90000 } // 90 second timeout
        );
        if (response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response structure from Gemini API.');
        }
    } catch (error) {
        console.error(`Error calling Gemini API for ${agent.name}:`, error.response ? error.response.data : error.message);
        const errorMessage = error.response ? (error.response.data && error.response.data.error ? error.response.data.error.message : JSON.stringify(error.response.data)) : error.message;
        throw new Error(`Gemini API Error for ${agent.name}: ${errorMessage}`);
    }
}

/**
 * Runs the entire story development workflow.
 * @param {string} apiKey - The user's Gemini API key.
 * @param {string} creativeBrief - The user's initial story concept.
 * @returns {Promise<object>} A promise that resolves to the final, structured report.
 */
async function runStoryDevelopment(apiKey, creativeBrief) {
    // == STEP 1: GENERATE IDEAS ==
    const ideaTaskPrompt = `Based on the following creative brief, generate a single, detailed story idea. Present it as a clear summary.\n\n**Creative Brief:**\n${creativeBrief}`;
    const [idea1Summary, idea2Summary] = await Promise.all([
        callAgent(apiKey, storyArchitectAgent, ideaTaskPrompt),
        callAgent(apiKey, characterDevelopmentAgent, ideaTaskPrompt)
    ]);

    // == STEP 2: INDEPENDENT REVIEWS ==
    const reviewTaskPrompt = `Two initial ideas have been generated. Your task is to provide a critical review of both from your specific perspective as the ${"%AGENT_NAME%"}. Analyze their strengths and weaknesses. Be critical and specific. Structure your output in two distinct sections, starting with "Review of Idea 1:" and then "Review of Idea 2:".\n\n**Idea 1 Summary:**\n${idea1Summary}\n\n**Idea 2 Summary:**\n${idea2Summary}`;
    const reviewPromises = allAgents.map(agent => {
        const agentTaskPrompt = reviewTaskPrompt.replace('%AGENT_NAME%', agent.name);
        return callAgent(apiKey, agent, agentTaskPrompt).then(reviewText => ({
            agent: agent.name,
            reviewText
        }));
    });
    const reviews = await Promise.all(reviewPromises);

    const idea1Reviews = [];
    const idea2Reviews = [];
    reviews.forEach(review => {
        const text = review.reviewText;
        // Use a more robust method to split reviews
        const idea1Match = text.match(/Review of Idea 1:([\s\S]*?)(Review of Idea 2:|$)/i);
        const idea2Match = text.match(/Review of Idea 2:([\s\S]*)/i);

        if (idea1Match && idea1Match[1]) {
            idea1Reviews.push({ agent: review.agent, text: idea1Match[1].trim() });
        }
        if (idea2Match && idea2Match[1]) {
            idea2Reviews.push({ agent: review.agent, text: idea2Match[1].trim() });
        }
    });

    // == STEP 3: THE TOURNAMENT (DEBATE) ==
    let debateTranscript = [];
    const debateRounds = 6;
    let availableAgents = [...allAgents];

    for (let i = 0; i < debateRounds; i++) {
        const agent = availableAgents.splice(Math.floor(Math.random() * availableAgents.length), 1)[0];
        const debateTaskPrompt = `A debate is underway to decide between two story ideas. Based on the ideas and the debate so far, present a concise and compelling argument. Compare the two ideas from your unique perspective. You can either build on previous points or rebut them. State which idea you favor and provide a clear justification.\n\n**The Ideas:**\n- Idea 1: ${idea1Summary}\n- Idea 2: ${idea2Summary}\n\n**Debate So Far:**\n${debateTranscript.length > 0 ? debateTranscript.map(t => `${t.agent}: ${t.argument}`).join('\n') : "You are the first to speak."}`;
        const argument = await callAgent(apiKey, agent, debateTaskPrompt);
        debateTranscript.push({ agent: agent.name, argument });
    }

    // == STEP 4: FINAL DECISION ==
    const finalDecisionTaskPrompt = `You are the Master Orchestrator. You have overseen a debate between expert agents. Based on the entire discussion, make the final decision. Announce which idea is better and provide a clear, final justification for your choice, summarizing the key arguments that led to this conclusion.\n\n**The Ideas:**\n- Idea 1: ${idea1Summary}\n- Idea 2: ${idea2Summary}\n\n**Full Debate Transcript:**\n${debateTranscript.map(t => `**${t.agent}**: ${t.argument}`).join('\n\n')}`;
    const finalDecision = await callAgent(apiKey, { name: "Master Orchestrator", guide: "You are a master storyteller and project lead, responsible for making the final, decisive call." }, finalDecisionTaskPrompt);

    // == STEP 5: COMPILE AND SEND REPORT ==
    const finalReport = {
        idea1: { summary: idea1Summary, reviews: idea1Reviews },
        idea2: { summary: idea2Summary, reviews: idea2Reviews },
        tournament: debateTranscript,
        finalDecision: finalDecision,
    };
    return finalReport;
}

module.exports = { runStoryDevelopment };
