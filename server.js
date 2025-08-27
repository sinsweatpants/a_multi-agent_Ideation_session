/**
 * @file server.js
 * This file sets up a simple Express.js web server. Its primary roles are:
 * 1. To serve the static frontend files from the 'public' directory.
 * 2. To provide a single API endpoint ('/api/develop-story') that acts as a gateway
 *    to the core application logic, which is handled by the orchestrator.
 */

const express = require('express');
const path = require('path');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid'); // To generate unique session IDs
const { runDivergence, runHybridization, runReviews, runRefinement, runDebate, runAudiencePersona, runSalvageAnalysis, runStressTest } = require('./orchestrator.js');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for session data. In a production environment,
// this would be replaced with a database or a Redis cache.
const sessions = {};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Endpoint to start a new story development session.
 * Kicks off the 'Divergence' stage.
 */
app.post('/api/start-session', async (req, res) => {
    const { apiKey, creativeBrief } = req.body;
    if (!apiKey || !creativeBrief) {
        return res.status(400).json({ error: 'API key and creative brief are required.' });
    }

    try {
        const sessionId = uuidv4();
        console.log(`[${sessionId}] Starting new session...`);

        const initialLoglines = await runDivergence({ apiKey, creativeBrief, sessionId });

        // Store the initial state in the session
        sessions[sessionId] = {
            apiKey,
            creativeBrief,
            initial_loglines: initialLoglines,
            finalReport: {
                sessionId: sessionId,
                initial_loglines: initialLoglines.map(idea => ({ id: idea.id, sourceAgent: idea.sourceAgent, text_ar: idea.text_ar })),
            }
        };

        console.log(`[${sessionId}] Divergence complete. Sending ${initialLoglines.length} loglines to client.`);
        res.json({ sessionId, loglines: initialLoglines });

    } catch (error) {
        console.error('Error in /api/start-session:', error);
        res.status(500).json({ error: error.message || 'Failed to start session.' });
    }
});

/**
 * Endpoint to handle user's logline selections and trigger the 'Hybridization' stage.
 */
app.post('/api/select-ideas', async (req, res) => {
    const { sessionId, chosenLoglines } = req.body;
    if (!sessionId || !sessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or expired session ID.' });
    }
    if (!Array.isArray(chosenLoglines) || chosenLoglines.length !== 2) {
        return res.status(400).json({ error: 'Exactly two loglines must be chosen.' });
    }

    const session = sessions[sessionId];

    try {
        console.log(`[${sessionId}] Received selection. Starting hybridization.`);
        const idea1 = session.initial_loglines.find(idea => idea.id === chosenLoglines[0]);
        const idea2 = session.initial_loglines.find(idea => idea.id === chosenLoglines[1]);

        if (!idea1 || !idea2) {
            return res.status(404).json({ error: 'One or more selected ideas not found in this session.' });
        }

        // --- Stage 2: Hybridization ---
        const hybridIdea = await runHybridization({ apiKey: session.apiKey, idea1, idea2 });
        session.hybrid_idea = hybridIdea;
        console.log(`[${sessionId}] Hybridization complete.`);

        // --- Stage 3: Reviews ---
        console.log(`[${sessionId}] Starting reviews...`);
        let ideasForReview = [idea1, idea2, hybridIdea];
        ideasForReview = await runReviews({ apiKey: session.apiKey, ideas: ideasForReview });
        console.log(`[${sessionId}] Reviews complete.`);

        // --- Stage 4: Refinement ---
        console.log(`[${sessionId}] Starting refinement...`);
        const refinedIdeas = await runRefinement({ apiKey: session.apiKey, ideas: ideasForReview });
        console.log(`[${sessionId}] Refinement complete.`);

        // --- Update Session and Final Report ---
        session.ideas = refinedIdeas; // Store the full idea objects with reviews and refinements
        session.finalReport.selected_loglines = chosenLoglines;
        session.finalReport.hybrid_idea = { id: hybridIdea.id, sourceAgent: hybridIdea.sourceAgent, text_ar: hybridIdea.text_ar };

        // Populate the reviews and refined versions into the final report
        session.finalReport.reviews_by_idea = {};
        session.finalReport.refined_versions = {};
        for (const idea of refinedIdeas) {
            // Find the original ID (e.g., logline1 -> idea1)
            const originalId = idea.origin === 'hybrid' ? 'idea3' : (idea.id === idea1.id ? 'idea1' : 'idea2');
            session.finalReport.reviews_by_idea[originalId] = idea.reviews.map(r => ({ agent: r.agent, review_ar: r.review_ar }));
            session.finalReport.refined_versions[originalId] = idea.refined;
        }

        // For now, we'll return the report-in-progress.
        // The next steps (Debate, etc.) would be triggered by another API call.
        res.json({ finalReport: session.finalReport });

    } catch (error) {
        console.error(`Error in /api/select-ideas for session ${sessionId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to process selected ideas.' });
    }
});

app.post('/api/debate', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !sessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or expired session ID.' });
    }
    if (!sessions[sessionId].ideas) {
        return res.status(400).json({ error: 'Review and refinement stages must be completed before starting the debate.' });
    }

    const session = sessions[sessionId];

    try {
        console.log(`[${sessionId}] Starting debate...`);
        const debateResults = await runDebate({
            apiKey: session.apiKey,
            ideas: session.ideas,
            sessionId: sessionId,
        });

        session.finalReport.debate = { rounds: debateResults };
        console.log(`[${sessionId}] Debate complete.`);

        // Return the report-in-progress.
        res.json({ finalReport: session.finalReport });

    } catch (error) {
        console.error(`Error in /api/debate for session ${sessionId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to run debate.' });
    }
});

app.post('/api/audience', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !sessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or expired session ID.' });
    }
    if (!sessions[sessionId].finalReport.debate) {
        return res.status(400).json({ error: 'Debate must be completed before the audience persona review.' });
    }

    const session = sessions[sessionId];

    try {
        console.log(`[${sessionId}] Starting audience persona review...`);
        const audienceReview = await runAudiencePersona({
            apiKey: session.apiKey,
            ideas: session.ideas,
            debateSummary: session.finalReport.debate,
        });

        session.finalReport.audience_persona_review = audienceReview;
        console.log(`[${sessionId}] Audience persona review complete.`);

        // Return the report-in-progress.
        res.json({ finalReport: session.finalReport });

    } catch (error) {
        console.error(`Error in /api/audience for session ${sessionId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to run audience persona review.' });
    }
});

app.post('/api/decide', async (req, res) => {
    const { sessionId, winner, justification_ar } = req.body;
    if (!sessionId || !sessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or expired session ID.' });
    }
    if (!winner || !justification_ar) {
        return res.status(400).json({ error: 'A winning idea and justification are required.' });
    }
    if (!sessions[sessionId].finalReport.audience_persona_review) {
        return res.status(400).json({ error: 'Audience review must be completed before making a final decision.' });
    }

    const session = sessions[sessionId];

    try {
        // --- Coordinator Decision ---
        session.finalReport.coordinator_decision = { winner, justification_ar };
        console.log(`[${sessionId}] Coordinator has decided on: ${winner}`);

        const winningIdea = session.ideas.find(idea => idea.id.includes(winner.slice(-1))); // Match idea1 to idea object
        const losingIdeas = session.ideas.filter(idea => !idea.id.includes(winner.slice(-1)));

        if (!winningIdea) {
             return res.status(404).json({ error: 'Winning idea not found in session.' });
        }

        // --- Salvage Analysis ---
        console.log(`[${sessionId}] Starting salvage analysis...`);
        const salvageAnalysis = await runSalvageAnalysis({
            apiKey: session.apiKey,
            winningIdea,
            losingIdeas,
        });
        session.finalReport.salvage_analysis = salvageAnalysis;
        console.log(`[${sessionId}] Salvage analysis complete.`);

        // --- Stress Test ---
        console.log(`[${sessionId}] Starting stress test...`);
        const stressTest = await runStressTest({ apiKey: session.apiKey, winningIdea });
        session.finalReport.stress_test = stressTest;
        console.log(`[${sessionId}] Stress test complete.`);

        // --- Final Report ---
        console.log(`[${sessionId}] Workflow complete. Sending final report.`);
        res.json({ finalReport: session.finalReport });

        // Clean up the session from memory
        delete sessions[sessionId];

    } catch (error) {
        console.error(`Error in /api/decide for session ${sessionId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to finalize report.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
