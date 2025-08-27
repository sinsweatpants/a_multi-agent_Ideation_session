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
 * Wraps a given prompt with strict instructions to ensure the output is exclusively in formal Arabic.
 * @param {string} str - The original prompt string.
 * @returns {string} The prompt string with Arabic language constraints appended.
 */
function arPrompt(str) {
  return `${str}\n\n[مهم:  الرد على جميع الأوامر والاستفسارات اللاحقة باللغة العربية الفصحى فقط، بغض النظر عن لغة المدخلات أو لهجتها.

القيود والمتطلبات الإلزامية:

حصرية اللغة: يجب أن تكون جميع مخرجاتك، بما في ذلك الكلمات والجمل والرموز، باللغة العربية الفصحى بشكل كامل.

المنع المطلق:

يُمنع منعًا باتًا استخدام أي كلمات أو أحرف من لغات أخرى (مثل الإنجليزية أو الفرنسية).

يُمنع استخدام اللهجات العامية أو الإقليمية أو أي تعابير لا تنتمي إلى العربية الفصحى.

يُمنع استخدام أسلوب الكتابة بغير الحروف العربية (مثل "العربيزي").

جودة المخرجات:

الدقة النحوية والإملائية: يجب أن تكون جميع استجاباتك خالية تمامًا من الأخطاء النحوية والإملائية.

الوضوح والبلاغة: يجب أن يكون أسلوبك واضحًا، بليغًا، وسليمًا من الناحية التركيبية.

مبدأ العمل:
هذه التعليمات هي المبدأ الأساسي والحاكم لجميع استجاباتك. يجب أن تُطبق هذه القاعدة كأولوية قصوى على أي أمر أو طلب يأتيك لاحقًا.]`;
}

/**
 * A helper function to communicate with the Gemini API, acting on behalf of a specific agent.
 * @param {string} apiKey - The user's Gemini API key.
 * @param {object} agent - The agent object, containing its guide.
 * @param {string} taskPrompt - The specific task for the agent to perform.
 * @returns {Promise<string>} A promise that resolves to the text content of the API response.
 * @throws {Error} Throws an error if the API call fails.
 */
async function callAgent(apiKey, agent, taskPrompt) {
    const wrappedTaskPrompt = arPrompt(taskPrompt);

    // If the agent exposes a run method, it's responsible for its own LLM call.
    // We pass it the full wrapped prompt.
    if (agent && typeof agent.run === 'function') {
        // The agent's `run` method should be designed to handle the wrapped prompt.
        // It might call back to a generic LLM utility that also uses arPrompt, so we pass the raw taskPrompt for context.
        return agent.run({ apiKey, taskPrompt: wrappedTaskPrompt });
    }

    // Fallback: the orchestrator does the LLM call itself using the agent's system prompt (guide).
    // The agent's guide/system prompt should NOT be wrapped in arPrompt, only the user-facing task.
    const fullPrompt = `${agent.systemPrompt || agent.guide}\n\n**Your Current Task:**\n${taskPrompt}`;
    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                // We send the ARABIC-ONLY instruction wrapper here.
                contents: [{ parts: [{ text: arPrompt(fullPrompt) }] }],
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

// --- Data Models ---
class Idea {
  constructor({ id, sourceAgent, origin, text_ar }) {
    this.id = id; // "idea1" | "idea2" | "idea3" | "loglineX"
    this.sourceAgent = sourceAgent; // اسم الوكيل
    this.origin = origin; // "divergence" | "hybrid"
    this.text_ar = text_ar;
    this.reviews = []; // [{agent, review_ar}]
    this.refined = null; // نص منقّح بالعربية
  }
}

// --- Helper Functions ---

// A simple mulberry32 pseudo-random number generator.
function seededRandom(seed) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// Fisher-Yates shuffle algorithm using a seeded RNG.
function shuffle(array, rng) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(rng() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

function pickDivergenceAgents(allAgents, seed) {
  const excluded = new Set(['storyArchitectAgent', 'characterDevelopmentAgent', 'strategicAnalystAgent']);
  const pool = allAgents.filter(a => !excluded.has(a.name));
  const rng = seededRandom(seed);
  return shuffle(pool, rng).slice(0, 5);
}


// --- Core Workflow Stages ---

/**
 * Stage 1: Divergence. Generate initial loglines from a diverse set of agents.
 * @param {object} params - The parameters for this stage.
 * @param {string} params.apiKey - The user's API key.
 * @param {string} params.creativeBrief - The user's initial story concept.
 * @param {string} params.sessionId - The unique ID for this session.
 * @returns {Promise<Array<Idea>>} A promise that resolves to an array of initial ideas.
 */
async function runDivergence({ apiKey, creativeBrief, sessionId }) {
    const divergenceAgents = pickDivergenceAgents(allAgents, sessionId.charCodeAt(0));

    const divergencePrompt = `**المهمة:**
صياغة ملخص قصصي احترافي (Logline) بناءً على الموجز الإبداعي المقدم. يجب أن يجسّد الملخص جوهر القصة في جمل موجزة ومؤثرة لإثارة الفضول.

**هيكل الملخص القصصي (Logline) المطلوب:**
يجب أن يحتوي الملخص على العناصر الأساسية التالية بوضوح:
1.  **الشخصية الرئيسية:** وصف موجز للبطل وحالته الأولية.
2.  **الحدث المحفز:** ما هو الحدث الذي يقلب عالم الشخصية رأسًا على عقب؟
3.  **الهدف والصراع:** ماذا يجب على الشخصية أن تفعل، وما هي العقبة الهائلة التي تواجهها؟
4.  **الرهانات (Stakes):** ما هي العواقب الوخيمة للفشل؟ (يُدمج ضمنياً لإضافة التشويق).

**المتطلبات والشروط:**
*   **الناتج:** ملخص قصصي (Logline) واحد فقط.
*   **الطول:** من جملتين إلى ثلاث جمل كحد أقصى.
*   **اللغة:** العربية الفصحى المعاصرة، بأسلوب أدبي جذاب وواضح.
*   **الجودة:** يجب أن تكون الفكرة فريدة ومبتكرة، وتتجنب القوالب المستهلكة (الكليشيهات)، مع التركيز على خلق تساؤل مركزي لدى القارئ.
*   **التنسيق:** لا تقم بتضمين أي عناوين أو مقدمات، قدم الملخص القصصي مباشرة.

**المدخلات:**
الموجز الإبداعي: "${creativeBrief}"`;

    const ideaPromises = divergenceAgents.map((agent, index) =>
        callAgent(apiKey, agent, divergencePrompt).then(loglineText =>
            new Idea({
                id: `logline${index + 1}`,
                sourceAgent: agent.name,
                origin: 'divergence',
                text_ar: loglineText.trim(),
            })
        )
    );

    const initialLoglines = await Promise.all(ideaPromises);
    return initialLoglines;
}

/**
 * Stage 2: Hybridization. Combine two selected ideas into a new, hybrid concept.
 * @param {object} params - The parameters for this stage.
 * @param {string} params.apiKey - The user's API key.
 * @param {Idea} params.idea1 - The first selected idea.
 * @param {Idea} params.idea2 - The second selected idea.
 * @returns {Promise<Idea>} A promise that resolves to the new hybrid idea.
 */
async function runHybridization({ apiKey, idea1, idea2 }) {
    const strategicAnalystAgent = allAgents.find(a => a.name === 'strategicAnalystAgent');
    if (!strategicAnalystAgent) throw new Error('strategicAnalystAgent not found!');

    const hybridizationPrompt = `**المهمة:**
إجراء تحليل منهجي لفكرتين روائيتين مقدمتين، ثم توليد فكرة ثالثة هجينة ومبتكرة تنتج عن دمج أقوى عناصر الشخصيات من إحدى الفكرتين مع أقوى عناصر الحبكة من الفكرة الأخرى. أخيرًا، قم بتقديم عرض مفصل ومنظم لهذه الفكرة الهجينة الجديدة.

**آلية العمل (يجب اتباعها خطوة بخطوة):**

**1. التحليل والتفكيك:**
*   **للفكرة الأولى:** قم بتحليل وتحديد نقاط القوة الجوهرية في الشخصيات والحبكة.
*   **للفكرة الثانية:** كرر نفس عملية التحليل.

**2. الاختيار الاستراتيجي والمبررات:**
*   بناءً على تحليلك، حدد بوضوح أي فكرة تمتلك البناء الأكثر عمقًا وإقناعًا للشخصيات، وأي فكرة تمتلك الحبكة الأكثر إثارة وتشويقًا.
*   قدم تبريرًا مختصرًا ومنطقيًا لهذا الاختيار.

**3. التوليف والدمج الإبداعي:**
*   اِدمج عناصر الشخصيات المختارة ضمن بنية الحبكة المختارة، مع تكييفها لتشكيل كيان سردي جديد ومتماسك.
*   عالج أي تناقضات قد تنشأ عن هذا الدمج.

**4. إنشاء الملخص المفصل:**
*   بناءً على الفكرة الهجينة، قم بصياغة ملخص شامل ومنظم باللغة العربية الفصحى.

**هيكل المخرجات المطلوب (يجب الالتزام بهذا التنسيق بدقة):**
*   **العنوان المقترح للفكرة الهجينة:**
*   **الملخص القصصي (Logline):** (جملتان إلى ثلاث جمل).
*   **أساس المفهوم (Concept Rationale):** (شرح موجز لعملية الدمج).
*   **ملفات الشخصيات الرئيسية:** (وصف موجز للشخصيات الرئيسية).
*   **ملخص الحبكة المفصل (مقسم إلى فصول):**
    *   الفصل الأول (الإعداد)
    *   الفصل الثاني (المواجهة)
    *   الفصل الثالث (الخاتمة)
*   **المواضيع والأفكار الجوهرية:** (قائمة نقطية).

**المدخلات:**
*   **الفكرة الأولى:**\n${idea1.text_ar}
*   **الفكرة الثانية:**\n${idea2.text_ar}`;

    const hybridText = await callAgent(apiKey, strategicAnalystAgent, hybridizationPrompt);

    return new Idea({
        id: 'idea3',
        sourceAgent: 'strategicAnalystAgent',
        origin: 'hybrid',
        text_ar: hybridText.trim(),
    });
}

// NOTE: The full `runStoryDevelopment` function is now replaced by a series of smaller,
// stateful functions that will be called by the server.

async function runReviews({ apiKey, ideas }) {
    const reviewPromptTemplate = `**المهمة:**
مراجعة الفكرة التالية نقديًا، وتقديم 3–5 نقاط نقدية محددة وقابلة للتنفيذ.

**المدخلات:**
الفكرة: "{idea_text}"

**الإخراج:**
قائمة نقدية موجزة بالعربية الفصحى.`;

    for (const idea of ideas) {
        const reviewPromises = allAgents.map(agent => {
            // An agent does not review its own idea.
            if (agent.name === idea.sourceAgent) return null;

            const reviewPrompt = reviewPromptTemplate.replace('{idea_text}', idea.refined || idea.text_ar);
            return callAgent(apiKey, agent, reviewPrompt).then(reviewText => {
                idea.reviews.push({ agent: agent.name, review_ar: reviewText.trim() });
            });
        }).filter(p => p !== null);
        await Promise.all(reviewPromises);
    }
    return ideas;
}

async function runRefinement({ apiKey, ideas }) {
    const refinementPromptTemplate = `**المهمة:**
مراجعة وتنقيح النص الأصلي بناءً على قائمة محددة من الملاحظات النقدية. الهدف هو إنتاج نسخة نهائية ومحسّنة تدمج التعديلات المطلوبة بفعالية مع الحفاظ على جوهر الفكرة الأساسية.

**التعليمات التفصيلية:**
1.  **تحليل النقد:** قم بدراسة كل ملاحظة نقدية لفهم المشكلة المحددة والتوجيه المقترح للتصويب.
2.  **التنقيح الاستراتيجي:** عند تعديل النص الأصلي، لا تقم فقط بتصحيح الأخطاء، بل ادمج الملاحظات بطريقة تعزز البنية العامة، والوضوح، والتأثير للنص.
3.  **الحفاظ على الاتساق:** تأكد من أن النسخة المنقحة تحافظ على نفس الأسلوب والنبرة الأصلية.
4.  **الإخراج النهائي:** يجب أن يكون الناتج هو النص المنقح والكامل فقط. تجنب تمامًا كتابة أي مقدمات، أو ملخصات للتغييرات، أو أي تعليقات إضافية.

**المدخلات:**
**1. النص الأصلي (النسخة الأولى):**
\`\`\`
{original_text}
\`\`\`
**2. قائمة الملاحظات النقدية للتنقيح:**
\`\`\`
{reviews}
\`\`\`
**المخرج المطلوب:**
النسخة النهائية والمنقحة من الملخص باللغة العربية.`;

    for (const idea of ideas) {
        const authorAgent = allAgents.find(a => a.name === idea.sourceAgent);
        if (!authorAgent) continue;

        const reviewPoints = idea.reviews.map(r => `- ${r.agent}: ${r.review_ar}`).join('\n');
        const refinementPrompt = refinementPromptTemplate
            .replace('{original_text}', idea.text_ar)
            .replace('{reviews}', reviewPoints);

        const refinedText = await callAgent(apiKey, authorAgent, refinementPrompt);
        idea.refined = refinedText.trim();
    }
    return ideas;
}

async function runDebate({ apiKey, ideas, sessionId }) {
    const debateRounds = [
        { topic: 'البنية السردية والقصصية', agents: ['storyArchitectAgent', 'pacingAgent'] },
        { topic: 'الشخصيات وتطورها', agents: ['characterDevelopmentAgent', 'realismCriticAgent'] },
        { topic: 'التجربة النهائية والنبرة', agents: ['genreToneAgent', 'conflictTensionAgent'] }
    ];

    const debateResults = [];

    const ideaTexts = ideas.map((idea, i) => `الفكرة ${i + 1}:\n${idea.refined}`).join('\n\n');

    // Create a pool of agents who can act as Devil's Advocate
    const participatingAgents = new Set(debateRounds.flatMap(r => r.agents));
    const devilsAdvocatePool = allAgents.filter(a => !participatingAgents.has(a.name));
    const rng = seededRandom(sessionId.charCodeAt(1)); // Use a different char for different seed

    for (const round of debateRounds) {
        const debatePrompt = `**المهمة:**
إجراء تحليل مقارن معمّق ومنظم لتقييم ثلاث أفكار مختلفة تتعلق بموضوع محدد، وتحديد الفكرة الأكثر تفوقًا بناءً على مجموعة من المعايير المحددة.

**المدخلات:**
*   **الموضوع الرئيسي للنقاش:** ${round.topic}
*   **الفكرة الأولى:** "${ideas[0].refined}"
*   **الفكرة الثانية:** "${ideas[1].refined}"
*   **الفكرة الثالثة:** "${ideas[2].refined}"

**خطوات التحليل المطلوبة:**
1.  **التحليل الفردي:** قم بتقييم كل فكرة على حدة، مع توضيح نقاط القوة والضعف فيها.
2.  **المقارنة المباشرة:** أنشئ مقارنة مباشرة بين الأفكار الثلاث.
3.  **الحكم النهائي والتوصية:** حدد الفكرة التي تعتبرها الأقوى بشكل عام مع تبرير واضح.

**شروط المخرجات:**
*   **اللغة:** العربية الفصحى.
*   **الأسلوب:** تحليلي، موضوعي، ومنظم.`;

        const debatingAgents = round.agents.map(name => allAgents.find(a => a.name === name));
        const debatePromises = debatingAgents.map(agent => callAgent(apiKey, agent, debatePrompt));
        const debateArguments = await Promise.all(debatePromises);
        const combinedArguments = debateArguments.join('\n\n---\n\n');

        // Devil's Advocate part
        const devilsAdvocateAgent = shuffle(devilsAdvocatePool, rng)[0]; // Pick one randomly
        const devilsAdvocatePrompt = `**المهمة:**
تطبيق منهجية "محامي الشيطان" لإجراء اختبار إجهاد (Stress Test) على الحجة المقدمة التي تدعي تفوق فكرة معينة. الهدف هو تحديد وكشف جميع نقاط الضعف المحتملة، والافتراضات غير المختبرة، والمخاطر الكامنة.

**إطار التحليل النقدي:**
1.  **تحدي الافتراضات الجذرية:** حدد الافتراضات الأساسية في الحجة وقدم حجة مضادة.
2.  **تحديد نقاط الفشل المحتملة:** حلل المنطق وابرز الحلقات الأضعف فيه.
3.  **استكشاف السيناريو الأسوأ:** تخيل أن الحجة خاطئة تمامًا، وصف كيف يمكن أن يكون ذلك.
4.  **كشف العواقب غير المقصودة:** إذا كانت الحجة صحيحة، ما هي الآثار الجانبية السلبية؟

**الحجة المطلوب تحليلها:**
"${combinedArguments}"`;

        const devilsAdvocateCritique = await callAgent(apiKey, devilsAdvocateAgent, devilsAdvocatePrompt);

        debateResults.push({
            topic: round.topic,
            agents: round.agents,
            arguments_ar: combinedArguments,
            devilsAdvocate: devilsAdvocateAgent.name,
            devilsAdvocate_critique_ar: devilsAdvocateCritique,
        });
    }

    return debateResults;
}


async function runAudiencePersona({ apiKey, ideas, debateSummary }) {
    const audienceAgent = allAgents.find(a => a.name === 'audiencePersonaAgent');
    if (!audienceAgent) throw new Error('audiencePersonaAgent not found!');

    // The agent will pick its own persona internally
    const persona = audienceAgent.personas[Math.floor(Math.random() * audienceAgent.personas.length)];

    const prompt = `**المهمة:**
محاكاة شخصية الجمهور المُعطاة بدقة، وتقديم ملاحظات نقدية وبنّاءة حول مجموعة من الأفكار المطروحة، مع الأخذ في الاعتبار سجل النقاش السابق. يجب أن تعكس استجابتك بالكامل وجهة نظر هذه الشخصية، بما في ذلك دوافعها، اهتماماتها، ومخاوفها المحتملة.

**المدخلات:**
1.  **تعريف شخصية الجمهور:**
    \`${persona}\`
2.  **ملخص الأفكار المنقّحة:**
    \`${ideas.map((idea, i) => `[الفكرة ${i+1}] ${idea.refined}`).join('\n\n')}\`
3.  **سجل النقاش:**
    \`${JSON.stringify(debateSummary, null, 2)}\`

**تعليمات التنفيذ:**
1.  **تقمّص الشخصية:** قم بتحليل وفهم أبعاد الشخصية المحددة.
2.  **التقييم من منظورها:** انطلاقاً من منظور هذه الشخصية فقط، قم بمراجعة الأفكار وسجل النقاش.
3.  **صياغة الملاحظات:** اكتب ردك بصيغة المتكلم ("أنا"، "أعتقد"، "يثير اهتمامي...")، وكأنك أنت هذه الشخصية التي تتحدث.

**هيكل المخرجات المطلوبة:**
يجب أن يكون ردك منظمًا بشكل واضح للإجابة على الأسلة التالية:
*   **الفكرة الأكثر إثارة للحماس:** (حدد الفكرة الواحدة التي تجدها الأكثر جاذبية).
*   **لماذا؟** (قدم تبريرًا مفصلاً يربط أسباب حماسك بشخصيتك).
*   **تساؤلات ومخاوف:** (ما هو السؤال أو القلق الرئيسي الذي يتبادر إلى ذهنك بشأن الفكرة التي اخترتها؟)
*   **سبب عدم اختيار الأفكار الأخرى:** (اذكر بإيجاز لماذا كانت الأفكار الأخرى أقل جاذبية).`;

    const rationale_ar = await callAgent(apiKey, audienceAgent, prompt);

    // Simple logic to infer which idea was voted for
    const inferVote = (text) => {
        if (text.includes('الفكرة 3') || text.includes('الثالثة')) return 'idea3';
        if (text.includes('الفكرة 2') || text.includes('الثانية')) return 'idea2';
        if (text.includes('الفكرة 1') || text.includes('الأولى')) return 'idea1';
        return 'idea1'; // Default
    };

    return { persona, vote_for: inferVote(rationale_ar), rationale_ar: rationale_ar.trim() };
}

async function runSalvageAnalysis({ apiKey, winningIdea, losingIdeas }) {
    const characterExpansionAgent = allAgents.find(a => a.name === 'characterExpansionAgent');
    if (!characterExpansionAgent) throw new Error('characterExpansionAgent not found!');

    const salvage_analysis = [];

    for (const loser of losingIdeas) {
        const prompt = `**المهمة:**
إجراء تحليل دمج إبداعي بين فكرتين مقدمتين: "الفكرة الفائزة" و"الفكرة الخاسرة". الهدف هو استخلاص العناصر الأكثر قيمة وقوة (مثل الشخصيات، الحبكات الفرعية، القواعد الحاكمة للعالم، أو المفاهيم الفريدة) من الفكرة الخاسرة، وتقديم توصيات واضحة لدمجها بشكل استراتيجي في الفكرة الفائزة لإثرائها وزيادة عمقها.

**المدخلات:**
1.  **الفكرة الفائزة:** \`${winningIdea.refined}\`
2.  **الفكرة الخاسرة:** \`${loser.refined}\`

**منهجية التحليل والتوصية:**
لكل توصية، يجب اتباع الهيكل الثلاثي التالي لضمان الوضوح والفائدة العملية:
1.  **تحديد العنصر:** (اذكر بوضوح العنصر القابل للإنقاذ من الفكرة الخاسرة).
2.  **مبررات الدمج:** (اشرح بشكل منطقي *لماذا* هذا العنصر يستحق الإنقاذ).
3.  **مقترح التنفيذ:** (قدّم تصورًا موجزًا وعمليًا لكيفية دمج هذا العنصر بسلاسة).

**تنسيق المخرجات:**
*   قدّم التحليل النهائي على شكل قائمة نقطية باللغة العربية الفصحى.`;

        const recommendationsText = await callAgent(apiKey, characterExpansionAgent, prompt);
        salvage_analysis.push({
            from_loser: loser.id,
            recommendations_ar: recommendationsText.split('\n').filter(r => r.trim().length > 0),
        });
    }
    return salvage_analysis;
}

async function runStressTest({ apiKey, winningIdea }) {
    const conflictTensionAgent = allAgents.find(a => a.name === 'conflictTensionAgent');
    if (!conflictTensionAgent) throw new Error('conflictTensionAgent not found!');

    const prompt = `**المهمة:**
إجراء "اختبار إجهاد" (Stress Test) شامل وموضوعي للفكرة المقدمة. الهدف هو تحديد نقاط الضعف المنطقية والدرامية بشكل استباقي، وتقييم المخاطر المتعلقة بها، واقتراح حلول عملية لتقوية البناء السردي.

**مجالات التحليل المطلوبة:**
1.  **الثغرات المنطقية (Plot Holes):** أي تناقضات في تسلسل الأحداث.
2.  **مصداقية الدوافع (Motivation Credibility):** هل دوافع الشخصيات الرئيسية واضحة وقوية؟
3.  **الحبكة والبنية (Plot & Structure):** تقييم الإيقاع، تصاعد المخاطر، قوة الذروة، والمصادفات المفرطة.
4.  **قوس الشخصية (Character Arc):** هل تطور الشخصية منطقي ومؤثر؟
5.  **الأصالة وتجنب الكليشيهات (Originality & Clichés):** مدى اعتماد الفكرة على قوالب مستهلكة.

**تنسيق المخرجات:**
قم بتقديم التحليل النهائي حصريًا على شكل "خارطة مخاطر" باللغة العربية. يجب أن يكون الناتج جدولًا بصيغة Markdown، منظمًا بدقة وفقًا للهيكل التالي:

### خارطة المخاطر
| المجال المُحلَّل | نقطة الضعف / الثغرة المحتملة | تقييم درجة الخطورة (عالية/متوسطة/منخفضة) | مسار مقترح للمعالجة والتخفيف |
| :--- | :--- | :--- | :--- |
| **المنطق** | *[صف هنا الثغرة المنطقية]* | *[حدد مدى التأثير]* | *[اقترح حلاً]* |

**المدخلات:**
الفكرة المراد اختبارها:
\`\`\`
${winningIdea.refined}
\`\`\`
`;

    const stressTestReport = await callAgent(apiKey, conflictTensionAgent, prompt);
    // This is a simplified parsing. A more robust solution would parse the markdown table properly.
    const risks = stressTestReport.match(/\| \*\*المنطق\*\* \|(.*?)\|/);
    const logic_gaps = stressTestReport.match(/\| \*\*الدوافع\*\* \|(.*?)\|/);
    return {
        risks_ar: risks ? [risks[1].trim()] : [],
        logic_gaps_ar: logic_gaps ? [logic_gaps[1].trim()] : [],
        mitigations_ar: [stressTestReport], // Return the full table as mitigation plan
    };
}

module.exports = {
    runDivergence,
    runHybridization,
    runReviews,
    runRefinement,
    runDebate,
    runAudiencePersona,
    runSalvageAnalysis,
    runStressTest,
};
