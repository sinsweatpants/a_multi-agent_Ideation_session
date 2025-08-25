/**
 * @file script.js
 * This file contains the client-side logic for the Multi-Agent Story Development application.
 * It handles user interactions, manages the UI flow, and communicates with the backend server.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    // A client-side variable to hold the API key securely. It is not sent to the server until needed.
    let apiKey = null;

    // --- DOM ELEMENT SELECTORS ---
    // A central place to get references to all necessary UI elements.
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyInput = document.getElementById('api-key-input');
    const startSessionBtn = document.getElementById('start-session-btn');
    const apiKeyError = document.getElementById('api-key-error');

    const creativeBriefSection = document.getElementById('creative-brief-section');
    const creativeBriefInput = document.getElementById('creative-brief-input');
    const generateIdeasBtn = document.getElementById('generate-ideas-btn');

    const resultsSection = document.getElementById('results-section');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const resultsContent = document.getElementById('results-content');

    // --- EVENT LISTENERS ---

    /**
     * Handles the click event for the "Start Session" button.
     * Validates the API key and transitions the UI to the creative brief section.
     */
    startSessionBtn.addEventListener('click', () => {
        const inputKey = apiKeyInput.value.trim();
        if (inputKey) {
            apiKey = inputKey;
            apiKeyError.classList.add('hidden');

            // UI transition: Hide API key section, show creative brief section.
            apiKeySection.classList.add('hidden');
            creativeBriefSection.classList.remove('hidden');
        } else {
            // Show an error if the API key is missing.
            apiKeyError.classList.remove('hidden');
        }
    });

    /**
     * Handles the click event for the "Generate Ideas" button.
     * Triggers the main application logic by sending the user's input to the backend.
     */
    generateIdeasBtn.addEventListener('click', () => {
        const creativeBrief = creativeBriefInput.value.trim();
        if (!creativeBrief) {
            alert('يرجى إدخال موجز إبداعي.'); // Please enter a creative brief.
            return;
        }

        // UI transition: Hide the brief section and show the loading/status indicator.
        creativeBriefSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        statusIndicator.classList.remove('hidden');
        resultsContent.classList.add('hidden');

        // Make the API call to the backend orchestrator.
        fetch('/api/develop-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: apiKey,
                creativeBrief: creativeBrief
            }),
        })
        .then(response => {
            // Handle non-successful HTTP responses.
            if (!response.ok) {
                // Try to get a specific error message from the server's JSON response
                return response.json().then(err => {
                    throw new Error(err.error || `Server responded with status: ${response.status}`);
                }).catch(() => {
                    // Fallback if the error response isn't JSON
                    throw new Error(`Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // If successful, populate the UI with the results.
            populateResults(data);
        })
        .catch(error => {
            // Handle fetch errors or errors thrown from the response handler.
            console.error('Error:', error);
            statusText.textContent = `حدث خطأ: ${error.message}. يرجى تحديث الصفحة والمحاولة مرة أخرى.`;
        });
    });

    // --- HELPER FUNCTIONS ---

    /**
     * Populates the entire results section with the data received from the server.
     * @param {object} data - The comprehensive report object from the backend.
     */
    function populateResults(data) {
        // Hide the status indicator and reveal the main results content area.
        statusIndicator.classList.add('hidden');
        resultsContent.classList.remove('hidden');

        // Helper to format text, replacing newlines with <br> tags for proper HTML rendering.
        const formatText = (text) => text ? text.replace(/\n/g, '<br>') : '';

        // Populate Idea 1 section
        document.getElementById('idea-1-content').innerHTML = `<p>${formatText(data.idea1.summary)}</p>`;
        const idea1ReviewsContainer = document.getElementById('idea-1-reviews');
        idea1ReviewsContainer.innerHTML = ''; // Clear previous reviews before populating.
        data.idea1.reviews.forEach(review => {
            const reviewEl = document.createElement('div');
            reviewEl.className = 'border-t pt-2 mt-2';
            reviewEl.innerHTML = `<p class="font-semibold text-blue-700">${review.agent}:</p><p>${formatText(review.text)}</p>`;
            idea1ReviewsContainer.appendChild(reviewEl);
        });

        // Populate Idea 2 section
        document.getElementById('idea-2-content').innerHTML = `<p>${formatText(data.idea2.summary)}</p>`;
        const idea2ReviewsContainer = document.getElementById('idea-2-reviews');
        idea2ReviewsContainer.innerHTML = '';
        data.idea2.reviews.forEach(review => {
            const reviewEl = document.createElement('div');
            reviewEl.className = 'border-t pt-2 mt-2';
            reviewEl.innerHTML = `<p class="font-semibold text-green-700">${review.agent}:</p><p>${formatText(review.text)}</p>`;
            idea2ReviewsContainer.appendChild(reviewEl);
        });

        // Populate Tournament (Debate) section
        const tournamentContainer = document.getElementById('tournament-content');
        tournamentContainer.innerHTML = '';
        data.tournament.forEach(turn => {
            const turnEl = document.createElement('div');
            turnEl.innerHTML = `<p class="mb-2"><span class="font-bold">${turn.agent}:</span> ${formatText(turn.argument)}</p>`;
            tournamentContainer.appendChild(turnEl);
        });

        // Populate Final Decision section
        document.getElementById('final-decision-content').innerHTML = `<p>${formatText(data.finalDecision)}</p>`;
    }
});
