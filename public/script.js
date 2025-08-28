/**
 * @file script.js
 * This file contains the client-side logic for the Multi-Agent Story Development application.
 * It handles user interactions, manages the UI flow, and communicates with the backend server.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js loaded");
    try {
        // --- STATE MANAGEMENT ---
        let apiKey = null;
        let sessionId = null;

        // --- DOM ELEMENT SELECTORS ---
        const apiKeySection = document.getElementById('api-key-section');
        const apiKeyInput = document.getElementById('api-key-input');
        const startSessionBtn = document.getElementById('start-session-btn');
        const apiKeyError = document.getElementById('api-key-error');

        // Updated for the new workflow
        const treatmentSection = document.getElementById('treatment-section');
        const treatmentInput = document.getElementById('treatment-input');
        const generateReportBtn = document.getElementById('generate-report-btn');

        const resultsSection = document.getElementById('results-section');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const resultsContent = document.getElementById('results-content');

        // --- EVENT LISTENERS ---
        startSessionBtn.addEventListener('click', () => {
            const inputKey = apiKeyInput.value.trim();
            if (inputKey) {
                apiKey = inputKey;
                apiKeyError.classList.add('hidden');
                apiKeySection.classList.add('hidden');
                treatmentSection.classList.remove('hidden');
            } else {
                apiKeyError.classList.remove('hidden');
            }
        });

        generateReportBtn.addEventListener('click', () => {
            const dramaticTreatment = treatmentInput.value.trim();
            if (!dramaticTreatment) {
                alert('يرجى إدخال معالجة درامية.');
                return;
            }

            treatmentSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            statusIndicator.classList.remove('hidden');
            statusText.textContent = 'يقوم وكيل السياق بتحليل المعالجة... قد يستغرق هذا بعض الوقت.';
            resultsContent.classList.add('hidden');

            fetch('/api/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, dramaticTreatment }),
            })
            .then(handleFetchError)
            .then(data => {
                sessionId = data.sessionId;
                renderContextReport(data.context_report); // New function to render the report
                statusIndicator.classList.add('hidden');
                resultsContent.classList.remove('hidden');
            })
            .catch(handleError);
        });

        // --- HELPER FUNCTIONS ---

        function handleFetchError(response) {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `Server responded with status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        }

        function handleError(error) {
            console.error('Error:', error);
            statusIndicator.classList.remove('hidden');
            resultsContent.classList.add('hidden');
            statusText.textContent = `حدث خطأ: ${error.message}. يرجى التحقق من مفتاح API وإعادة المحاولة.`;
        }

        function renderContextReport(report) {
            const contentEl = document.getElementById('results-content');
            contentEl.innerHTML = `
                <section id="context-report-section">
                    <h2 class="text-2xl font-bold mb-4">تقرير تحليل السياق الدرامي</h2>
                    <div class="space-y-6">
                        ${renderReportCard('الفحص المجهري للنبرة', report.tonal_microscopy)}
                        ${renderReportCard('النص الفرعي العاطفي', report.emotional_subtext)}
                        ${renderReportCard('الإيقاع والسرعة', report.pacing_and_rhythm)}
                        ${renderReportCard('النوع وتوقعات الجمهور', report.genre_and_audience_expectations)}
                        ${renderListCard('الأسئلة الدرامية الرئيسية', report.key_dramatic_questions)}
                        ${renderListCard('الوكلاء الموصى بهم للمرحلة التالية', report.recommended_agents, 'bg-green-50 border-green-500')}
                    </div>
                </section>
                <section id="next-step-section" class="mt-8">
                     <button id="generate-ideas-btn" class="w-full bg-blue-600 text-white font-bold py-3 px-8 rounded-md hover:bg-blue-700">
                        استدعاء الوكلاء الموصى بهم لتوليد الأفكار (قيد التطوير)
                     </button>
                </section>
            `;
            // TODO: Add event listener for the next step button.
        }

        function renderReportCard(title, content) {
            return `
                <article class="p-4 border-l-4 border-gray-300 bg-gray-50 rounded-r-lg">
                    <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                    <p class="mt-2 text-gray-700">${content}</p>
                </article>
            `;
        }
        function renderListCard(title, items, customClasses = 'bg-blue-50 border-blue-500') {
             return `
                <article class="p-4 border-l-4 ${customClasses} rounded-r-lg">
                    <h3 class="text-xl font-semibold">${title}</h3>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        ${items.map(item => `<li class="text-gray-700">${item}</li>`).join('')}
                    </ul>
                </article>
            `;
        }

    } catch (error) {
        console.error("A critical error occurred:", error);
        document.body.innerHTML = '<div class="bg-red-100 text-red-800 p-4">حدث خطأ فادح. يرجى التحقق من وحدة التحكم.</div>';
    }
});
