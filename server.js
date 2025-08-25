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

// Import the main logic function from the orchestrator module
const { runStoryDevelopment } = require('./orchestrator.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // To serve static frontend files

/**
 * The main API endpoint for story development.
 * It receives the API key and creative brief from the client, passes them to the
 * orchestrator, and then sends the orchestrator's final report back to the client.
 */
app.post('/api/develop-story', async (req, res) => {
    const { apiKey, creativeBrief } = req.body;

    // Basic input validation
    if (!apiKey || !creativeBrief) {
        return res.status(400).json({ error: 'API key and creative brief are required.' });
    }

    try {
        // Delegate the entire complex workflow to the orchestrator
        console.log("Passing request to orchestrator...");
        const finalReport = await runStoryDevelopment(apiKey, creativeBrief);
        console.log("Orchestrator finished. Sending report to client.");

        // Send the completed report back to the client
        res.json(finalReport);

    } catch (error) {
        // If the orchestrator throws an error, catch it here and send a server error response.
        console.error('Error in /api/develop-story endpoint:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred during story development.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
