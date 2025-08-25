/**
 * @file server.js
 * This file contains the backend server for the Multi-Agent Story Development application.
 * It uses Express.js to serve the frontend and handle API requests.
 * The core logic involves orchestrating a series of calls to the Gemini API to simulate
 * a team of AI agents collaborating on story development.
 */

const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Import agent definitions
const { allAgents, storyArchitectAgent, characterDevelopmentAgent } = require('./agents.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // To serve static frontend files

// --- Gemini API Helper ---
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

/**
 * A helper function to make calls to the Gemini API.
 * @param {string} apiKey - The user's Gemini API key.
 * @param {string} prompt - The prompt to send to the model.
 * @returns {Promise<string>} A promise that resolves to the text content of the API response.
 * @throws {Error} Throws an error if the API call fails.
 */
async function callGemini(apiKey, prompt) {
    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                },
            },
            { timeout: 90000 } // 90 second timeout for API calls
        );
        // Safely access the response text
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
        // Rethrow a more specific error to be caught by the endpoint handler
        throw new Error(`Gemini API Error: ${error.response ? error.response.data.error.message : error.message}`);
    }
}

// --- Main Story Development Endpoint ---
app.post('/api/develop-story', async (req, res) => {
    const { apiKey, creativeBrief } = req.body;

    // Basic input validation
    if (!apiKey || !creativeBrief) {
        return res.status(400).json({ error: 'API key and creative brief are required.' });
    }

    try {
        // == STEP 1: GENERATE IDEAS ==
        // Two agents generate initial ideas in parallel to provide diverse starting points.
        const ideaPrompt = `You are the %AGENT_NAME%. Your mission is to use your unique expertise to generate a compelling story idea based on the following creative brief.

        **Creative Brief:**
        ${creativeBrief}

        **Your Task:**
        Based on your core identity and the brief, generate a single, detailed story idea. Present it as a clear summary.`;

        const [idea1Summary, idea2Summary] = await Promise.all([
            callGemini(apiKey, ideaPrompt.replace('%AGENT_NAME%', storyArchitectAgent.name) + `\n\nYour guide:\n${storyArchitectAgent.guide}`),
            callGemini(apiKey, ideaPrompt.replace('%AGENT_NAME%', characterDevelopmentAgent.name) + `\n\nYour guide:\n${characterDevelopmentAgent.guide}`)
        ]);

        // == STEP 2: INDEPENDENT REVIEWS ==
        // All agents review both ideas in parallel to gather a wide range of perspectives quickly.
        const reviewPrompt = `You are the %AGENT_NAME%. You are part of a team developing a story. Two initial ideas have been generated. Your task is to provide a critical review of both ideas from your specific perspective.

        **Your Guide:**
        ${"%AGENT_GUIDE%"}

        **Idea 1 Summary:**
        ${idea1Summary}

        **Idea 2 Summary:**
        ${idea2Summary}

        **Your Task:**
        From your unique perspective, analyze the strengths and weaknesses of both Idea 1 and Idea 2. Be critical and specific. Structure your output in two distinct sections, starting with "Review of Idea 1:" and then "Review of Idea 2:".`;

        const reviewPromises = allAgents.map(agent => {
            const agentPrompt = reviewPrompt
                .replace('%AGENT_NAME%', agent.name)
                .replace('%AGENT_GUIDE%', agent.guide);
            return callGemini(apiKey, agentPrompt).then(reviewText => ({
                agent: agent.name,
                reviewText
            }));
        });

        const reviews = await Promise.all(reviewPromises);

        // Parse the reviews to associate them with the correct idea.
        const idea1Reviews = [];
        const idea2Reviews = [];
        reviews.forEach(review => {
            const text = review.reviewText;
            // Use regex to robustly find the sections, ignoring case.
            const idea1Match = text.match(/Review of Idea 1:([\s\S]*?)Review of Idea 2:/i);
            const idea2Match = text.match(/Review of Idea 2:([\s\S]*)/i);

            if (idea1Match && idea1Match[1]) {
                idea1Reviews.push({ agent: review.agent, text: idea1Match[1].trim() });
            }
            if (idea2Match && idea2Match[1]) {
                idea2Reviews.push({ agent: review.agent, text: idea2Match[1].trim() });
            }
        });

        // == STEP 3: THE TOURNAMENT (DEBATE) ==
        // A sequential debate simulates a real-time discussion where agents build on or rebut previous points.
        let debateTranscript = [];
        let fullReviewText = reviews.map(r => `## ${r.agent}:\n${r.reviewText}`).join('\n\n');
        const debateRounds = 6; // A reasonable number of turns for a substantive debate.
        let availableAgents = [...allAgents]; // Create a mutable copy of agents for selection.

        for (let i = 0; i < debateRounds; i++) {
            // Select an agent at random for each turn to simulate a dynamic conversation.
            const agent = availableAgents.splice(Math.floor(Math.random() * availableAgents.length), 1)[0];

            const debatePrompt = `You are the **${agent.name}**. A debate is underway to decide between two story ideas.

            **Your Guide:**
            ${agent.guide}

            **The Ideas:**
            - **Idea 1:** ${idea1Summary}
            - **Idea 2:** ${idea2Summary}

            **Full Independent Reviews:**
            ${i === 0 ? fullReviewText : '(Summarized for brevity)'}

            **Debate So Far:**
            ${debateTranscript.length > 0 ? debateTranscript.map(t => `${t.agent}: ${t.argument}`).join('\n') : "You are the first to speak in this debate."}

            **Your Task:**
            Present a concise and compelling argument. Compare the two ideas from your unique perspective. You can either build on previous points or rebut them. State which idea you favor and provide a clear justification.`;

            const argument = await callGemini(apiKey, debatePrompt);
            debateTranscript.push({ agent: agent.name, argument });
        }

        // == STEP 4: FINAL DECISION ==
        // A final "Master Orchestrator" persona synthesizes the entire debate to make a final, justified decision.
        const finalDecisionPrompt = `You are the Master Orchestrator. You have overseen a debate between 11 expert agents regarding two story ideas.

        **The Ideas:**
        - **Idea 1:** ${idea1Summary}
        - **Idea 2:** ${idea2Summary}

        **Full Debate Transcript:**
        ${debateTranscript.map(t => `**${t.agent}**: ${t.argument}`).join('\n\n')}

        **Your Task:**
        Based on this entire discussion, make the final decision. Announce which idea is better and provide a clear, final justification for your choice, summarizing the key arguments that led to this conclusion.`;

        const finalDecision = await callGemini(apiKey, finalDecisionPrompt);

        // == STEP 5: COMPILE AND SEND REPORT ==
        // The final report is structured in the format expected by the frontend.
        const finalReport = {
            idea1: { summary: idea1Summary, reviews: idea1Reviews },
            idea2: { summary: idea2Summary, reviews: idea2Reviews },
            tournament: debateTranscript,
            finalDecision: finalDecision,
        };

        res.json(finalReport);

    } catch (error) {
        // Catch any errors from the orchestration process and send a server error response.
        console.error('Error in /api/develop-story endpoint:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred on the server.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
