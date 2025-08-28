document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js loaded");
    try {
        // --- DOM ELEMENT SELECTORS ---
        const treatmentSection = document.getElementById('treatment-section');
        const treatmentInput = document.getElementById('treatment-input');
        const generateReportBtn = document.getElementById('generate-report-btn');

        const resultsSection = document.getElementById('results-section');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const resultsContent = document.getElementById('results-content');

        // --- EVENT LISTENERS ---
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                const dramaticTreatment = treatmentInput.value.trim();
                if (!dramaticTreatment) {
                    alert('يرجى إدخال معالجة درامية.');
                    return;
                }

                // Hide form and show loading indicator
                treatmentSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                statusIndicator.classList.remove('hidden');
                statusText.textContent = 'بدء جلسة توليد الأفكار... قد تستغرق هذه العملية عدة دقائق.';
                resultsContent.classList.add('hidden');

                // Send the dramatic treatment with retry mechanism
                startSessionWithRetry({ dramaticTreatment })
                .then(data => {
                    // Hide loading and show the final report
                    statusIndicator.classList.add('hidden');
                    resultsContent.classList.remove('hidden');
                    renderFinalReport(data.report);
                })
                .catch(handleError);
            });
        }

        // --- HELPER FUNCTIONS ---

        async function startSessionWithRetry(payload) {
            const url = '/api/start-session';
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) return res.json();
                    if (res.status === 503) {
                        statusText.textContent = `محاولة ${attempt + 1}/4 - الخدمة غير متاحة مؤقتاً... إعادة المحاولة`;
                        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
                        continue;
                    }
                    throw new Error(`Server responded with status: ${res.status}`);
                } catch (error) {
                    if (attempt === 3) throw error;
                    if (error.message.includes('503') || error.message.includes('fetch')) {
                        statusText.textContent = `محاولة ${attempt + 1}/4 - مشكلة اتصال... إعادة المحاولة`;
                        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
                    } else {
                        throw error;
                    }
                }
            }
            throw new Error('Service temporarily unavailable after retries');
        }

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
            statusText.textContent = `حدث خطأ: ${error.message}. يرجى التحقق من وحدة التحكم وإعادة المحاولة.`;
        }

        function renderFinalReport(reportText) {
            // A simple way to display the comprehensive report from the backend
            // For a better experience, this could parse the Markdown, but for now, preformatted text is fine.
            resultsContent.innerHTML = `
                <h2 class="text-3xl font-bold mb-6 text-center">التقرير الشامل لتوليد الأفكار</h2>
                <pre class="bg-gray-800 text-white p-6 rounded-lg whitespace-pre-wrap font-mono text-sm">${reportText}</pre>
            `;
        }

    } catch (error) {
        console.error("A critical error occurred:", error);
        document.body.innerHTML = '<div class="bg-red-100 text-red-800 p-4">حدث خطأ فادح. يرجى التحقق من وحدة التحكم.</div>';
    }
});
