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

        const creativeBriefSection = document.getElementById('creative-brief-section');
        const creativeBriefInput = document.getElementById('creative-brief-input');
        const generateIdeasBtn = document.getElementById('generate-ideas-btn');

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
                creativeBriefSection.classList.remove('hidden');
            } else {
                apiKeyError.classList.remove('hidden');
            }
        });

        generateIdeasBtn.addEventListener('click', () => {
            const creativeBrief = creativeBriefInput.value.trim();
            if (!creativeBrief) {
                alert('يرجى إدخال موجز إبداعي.');
                return;
            }

            creativeBriefSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            statusIndicator.classList.remove('hidden');
            statusText.textContent = 'يتواصل المنسق مع الوكلاء لإنشاء الأفكار الأولية...';
            resultsContent.classList.add('hidden');

            fetch('/api/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, creativeBrief }),
            })
            .then(handleFetchError)
            .then(data => {
                sessionId = data.sessionId;
                renderDivergence(data.loglines);
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
            statusText.textContent = `حدث خطأ: ${error.message}. يرجى تحديث الصفحة والمحاولة مرة أخرى.`;
        }

        function advanceWorkflow(stage, data) {
            statusIndicator.classList.add('hidden');
            resultsContent.classList.remove('hidden');

            // Hide all sections initially to control flow
            document.querySelectorAll('#results-content > section').forEach(sec => sec.style.display = 'block');

            if (stage === 'hybrid') {
                document.getElementById('divergence-section').style.display = 'none';
                populateHybrid(data);
                const selectionEl = document.getElementById('selection-section');
                selectionEl.innerHTML = `<button id="debateBtn" class="w-full bg-blue-600 text-white font-bold py-3 px-8 rounded-md hover:bg-blue-700">بدء جولات النقاش</button>`;
                document.getElementById('debateBtn').onclick = () => runStage('debate', 'بدء جولات النقاش...');
            } else if (stage === 'debate') {
                populateDebate(data.debate);
                const selectionEl = document.getElementById('selection-section');
                selectionEl.innerHTML = `<button id="audienceBtn" class="w-full bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">استدعاء صوت الجمهور</button>`;
                document.getElementById('audienceBtn').onclick = () => runStage('audience', 'محاكاة شخصية الجمهور...');
            } else if (stage === 'audience') {
                populateAudience(data.audience_persona_review);
                const selectionEl = document.getElementById('selection-section');
                selectionEl.innerHTML = `
                    <h3 class="text-xl font-bold mb-2">القرار النهائي للمنسق</h3>
                    <p class="text-gray-600 mb-4">بناءً على جميع المدخلات، حدد الفكرة الفائزة وقدم مبرراتك.</p>
                    <div class="flex flex-col sm:flex-row gap-4 items-center">
                        <select id="winner-select" class="p-2 border rounded-md w-full sm:w-auto">
                            <option value="idea1">الفكرة 1</option>
                            <option value="idea2">الفكرة 2</option>
                            <option value="idea3">الفكرة 3 (الهجينة)</option>
                        </select>
                        <input id="justification-input" type="text" placeholder="اكتب مبرراتك هنا..." class="flex-grow p-2 border rounded-md w-full">
                        <button id="decideBtn" class="bg-red-600 text-white font-bold py-2 px-6 rounded-md hover:bg-red-700 w-full sm:w-auto">إصدار القرار النهائي</button>
                    </div>`;
                document.getElementById('decideBtn').onclick = () => {
                    const winner = document.getElementById('winner-select').value;
                    const justification_ar = document.getElementById('justification-input').value;
                    if (!justification_ar) {
                        alert('يرجى تقديم مبرر للقرار.');
                        return;
                    }
                    runStage('decide', 'إجراء تحليل الإنقاذ واختبار الإجهاد...', { winner, justification_ar });
                };
            } else if (stage === 'decision') {
                document.getElementById('selection-section').style.display = 'none';
                populateFinalReport(data);
            }
        }

        function runStage(stageName, statusTextMsg, body = {}) {
            statusIndicator.classList.remove('hidden');
            statusText.textContent = statusTextMsg;
            document.getElementById('selection-section').innerHTML = '';

            fetch(`/api/${stageName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, ...body })
            })
            .then(handleFetchError)
            .then(data => {
                const nextStage = stageName === 'decide' ? 'decision' : stageName;
                advanceWorkflow(nextStage, data.finalReport);
            })
            .catch(handleError);
        }

        function renderDivergence(loglines) {
          const el = document.getElementById('divergence-section');
          el.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">المرحلة 1: التشتيت الإبداعي - اختيار الأفكار</h2>
            <p class="text-gray-600 mb-4">يرجى اختيار فكرتين بالضبط.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${loglines.map(ll => `
                  <article class="card border p-4 rounded-lg shadow-sm">
                    <h4 class="font-bold text-lg text-blue-800">${ll.sourceAgent}</h4>
                    <p class="my-2">${ll.text_ar}</p>
                    <label class="flex items-center mt-4 bg-gray-100 p-2 rounded-md cursor-pointer">
                        <input type="checkbox" name="pick" value="${ll.id}" class="form-checkbox h-5 w-5 text-blue-600">
                        <span class="ml-2 text-gray-700 font-semibold">اختيار</span>
                    </label>
                  </article>`).join('')}
            </div>`;

          const selectionEl = document.getElementById('selection-section');
          selectionEl.innerHTML = `<button id="continueBtn" class="w-full bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700">متابعة بالاختيار (فكرتان)</button>`;

          document.getElementById('continueBtn').onclick = () => {
            const picked = [...document.querySelectorAll('input[name="pick"]:checked')].map(i => i.value);
            if (picked.length !== 2) {
              alert('يجب اختيار فكرتين بالضبط');
              return;
            }

            document.getElementById('continueBtn').disabled = true;
            statusIndicator.classList.remove('hidden');
            statusText.textContent = 'دمج الأفكار، والمراجعة، والتنقيح...';
            document.getElementById('divergence-section').style.display = 'none';

            fetch('/api/select-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, chosenLoglines: picked })
            })
            .then(handleFetchError)
            .then(data => advanceWorkflow('hybrid', data.finalReport))
            .catch(handleError);
          };
        }

        function populateHybrid(report) {
             document.getElementById('hybrid-section').innerHTML = `
                <h2 class="text-2xl font-bold mb-4">المرحلة 2: الدمج/الهجنة</h2>
                <article class="card border p-4 rounded-lg shadow-sm bg-purple-50">
                    <h4 class="font-bold text-lg text-purple-800">${report.hybrid_idea.sourceAgent}</h4>
                    <div class="my-2 prose max-w-none">${report.hybrid_idea.text_ar.replace(/\n/g, '<br>')}</div>
                </article>
            `;
            document.getElementById('reviews-section').innerHTML = `<h2 class="text-2xl font-bold mb-4">المراحل 3 & 4: المراجعات والتنقيح</h2><p>تم الانتهاء من مراجعة وتنقيح الأفكار الثلاث. جاهز للمناقشة.</p>`;
        }

        function populateDebate(debate) {
            const el = document.getElementById('debate-section');
            el.innerHTML = `<h2 class="text-2xl font-bold mb-4">المرحلة 5: النقاش الموضوعي</h2>` +
            debate.rounds.map(round => `
                <details class="p-4 border rounded-lg mt-4" open>
                    <summary class="font-bold text-xl cursor-pointer">${round.topic}</summary>
                    <p class="text-sm text-gray-500 mt-2">المتناظرون: ${round.agents.join(', ')}</p>
                    <div class="mt-2 p-3 bg-gray-50 rounded prose max-w-none">${round.arguments_ar.replace(/\n/g, '<br>')}</div>
                    <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded prose max-w-none">
                        <h5 class="font-bold">محامي الشيطان (${round.devilsAdvocate}):</h5>
                        ${round.devilsAdvocate_critique_ar}
                    </div>
                </details>
            `).join('');
        }

        function populateAudience(audience) {
            const el = document.getElementById('audience-section');
            el.innerHTML = `<h2 class="text-2xl font-bold mb-4">المرحلة 6: صوت الجمهور</h2>
                <div class="p-4 border-r-4 border-yellow-500 bg-yellow-50">
                    <p>الشخصية المُحاكاة: <strong class="text-yellow-800">${audience.persona}</strong></p>
                    <p>التصويت لصالح: <strong class="text-yellow-800">${audience.vote_for}</strong></p>
                    <blockquote class="mt-2 text-gray-700">${audience.rationale_ar}</blockquote>
                </div>`;
        }

        function populateFinalReport(report) {
            document.getElementById('hybrid-section').style.display = 'none';
            document.getElementById('reviews-section').style.display = 'none';
            document.getElementById('debate-section').style.display = 'none';
            document.getElementById('audience-section').style.display = 'none';

            document.getElementById('decision-section').innerHTML = `
                <h2 class="text-2xl font-bold mb-4">المرحلة 7: القرار النهائي</h2>
                <div class="p-4 bg-green-100 border-l-4 border-green-500 rounded-lg">
                    <p class="text-lg">الفكرة الفائزة: <strong class="text-green-800">${report.coordinator_decision.winner}</strong></p>
                    <p class="mt-2">المبررات: ${report.coordinator_decision.justification_ar}</p>
                </div>`;

            document.getElementById('salvage-section').innerHTML = `
                <h2 class="text-2xl font-bold mb-4">المرحلة 8: تحليل الإنقاذ</h2>
                ${report.salvage_analysis.map(s => `
                    <div class="p-4 border rounded-lg mt-2">
                        <h3 class="font-bold">عناصر مقترحة للدمج من فكرة خاسرة:</h3>
                        <ul class="list-disc list-inside mt-2 text-gray-700">${s.recommendations_ar.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                `).join('')}`;

            document.getElementById('stress-section').innerHTML = `
                <h2 class="text-2xl font-bold mb-4">المرحلة 9: اختبار الإجهاد</h2>
                <div class="prose max-w-none p-4 border rounded-lg">${report.stress_test.mitigations_ar[0].replace(/\|/g, ' | ').replace(/\n---/g, '\n---')}</div>`;

            const finalReportEl = document.getElementById('final-report-section');
            finalReportEl.innerHTML = `<h2 class="text-2xl font-bold mb-4">ملخص التقرير النهائي (JSON)</h2>
                <details>
                    <summary class="cursor-pointer">عرض/إخفاء التقرير الكامل</summary>
                    <pre class="bg-gray-800 text-white p-4 mt-2 rounded-md text-sm whitespace-pre-wrap">${JSON.stringify(report, null, 2)}</pre>
                </details>`;
        }
    } catch (error) {
        console.error(error);
        alert("An error occurred: " + error);
    }
});
