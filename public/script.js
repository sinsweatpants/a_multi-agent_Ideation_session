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

            // Send the dramatic treatment to the new endpoint
            fetch('/api/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dramaticTreatment }),
            })
            .then(handleFetchError)
            .then(data => {
                // Hide loading and show the final report
                statusIndicator.classList.add('hidden');
                resultsContent.classList.remove('hidden');
                renderFinalReport(data.report);
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
