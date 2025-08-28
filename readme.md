# مستند تسليم تقني للمشروع

## 1) ملخص المشروع العام
- **الغرض:** نظام تطوير قصص إبداعية يعتمد على وكلاء ذكاء اصطناعي متخصصين. يقوم النظام بتحليل وتوسيع الأفكار السردية بناءً على مدخلات المستخدم، بهدف إنتاج مفهوم قصصي متكامل ومتطور.
- **التقنيات الأساسية:** Rust (خلفية)، HTML/CSS/JS (واجهة أمامية).
- **بنية التفاعل عالي المستوى:** الواجهة الأمامية (ملفات ثابتة) تتواصل مع الواجهة الخلفية عبر استدعاءات API (RESTful). الواجهة الخلفية، من خلال `orchestrator.rs`، تنسق المهام بين مجموعة من الوكلاء المتخصصين (`src/agents/*`) لمعالجة الطلبات، بدءًا من تحليل السياق الدرامي وصولًا إلى توليد الأفكار والمناقشة.
- **وكلاء النظام (Agents):** تم إحصاؤهم من محتوى `src/agents/mod.rs` أثناء التحليل: **14**.

---

## 2) تحليل مفصل للملفات والمجلدات

### 2.1 النظام/الداعمة
#### مسار: `/home/user/asdf/.idx`
- **الغرض:** مجلد يحتوي على إعدادات وبيانات داعمة لبيئة التطوير. **لا تحليل تفصيلي** (باستثناء الملفات النصية أدناه).

#### مسار: `/home/user/asdf/.idx/airules.md`
- **الغرض:** يحدد القواعد والتعليمات التشغيلية للـ AI (Gemini) الذي يعمل كمنسق (Orchestrator).
- **تحليل تفصيلي (مختصر + مقتطف):** يحتوي الملف على دليل مفصل للمشروع، يصف وظيفة كل ملف ومجلد. هذا الملف يعمل كوثيقة تعريفية أساسية للمطورين لفهم بنية المشروع بسرعة.
```md
# /home/user/asdf/src/main.rs
هذه هي نقطة الدخول الرئيسية للواجهة الخلفية Rust.
يقوم بتهيئة التطبيق وبدء تشغيل الخادم.
إنه أول كود يتم تنفيذه عند تشغيل التطبيق.
```

#### مسار: `/home/user/asdf/.idx/dev.nix`

* **الغرض:** تعريف بيئة تطوير قابلة للتكرار (reproducible) باستخدام مدير الحزم Nix.
* **تحليل تفصيلي (مختصر + مقتطف):** يحدد الملف الحزم (مثل `rustc`, `cargo`) والإصدارات الدقيقة المطلوبة لبناء وتشغيل المشروع، مما يضمن بيئة عمل متطابقة لجميع المطورين.
```nix
{ pkgs ? import <nixpkgs> { } }:
pkgs.mkShell {
  buildInputs = [
    pkgs.rustc
    pkgs.cargo
    pkgs.cargo-watch
    pkgs.rust-analyzer
  ];
}
```

#### مسار: `/home/user/asdf/.qodo`

* **الغرض:** مجلد مخفي، من المحتمل أن يحتوي على بيانات أو إعدادات خاصة بأداة تطوير معينة. **لا تحليل تفصيلي.**

---

### 2.2 الواجهة الأمامية (public)

#### `/home/user/asdf/public/index.html`

* **الغرض:** المستند الجذري (Root Document) لواجهة المستخدم.
* **تحليل تفصيلي:** هيكل HTML يوفر واجهة من خطوتين: الأولى لإدخال مفتاح API، والثانية لإدخال "المعالجة الدرامية" للقصة.
```html
<!-- /home/user/asdf/public/index.html -->
<section id="api-key-section">
    <h2 class="text-2xl font-semibold mb-4">الخطوة 1: أدخل مفتاح Gemini API الخاص بك</h2>
    <input type="password" id="api-key-input" ...>
    <button id="start-session-btn" ...>تأكيد وبدء الجلسة</button>
</section>
<section id="treatment-section" class="hidden">
    <h2 class="text-2xl font-semibold mb-4">الخطوة 2: أدخل المعالجة الدرامية</h2>
    <textarea id="treatment-input" rows="8" ...></textarea>
    <button id="generate-report-btn" ...>تحليل السياق</button>
</section>
```
* **التبعيات/التفاعلات:** يعتمد على `style.css` للتصميم، و `script.js` للمنطق والوظائف.

#### `/home/user/asdf/public/style.css`

* **الغرض:** يحتوي على الأنماط المخصصة التي تكمل Tailwind CSS.
* **تحليل تفصيلي:** يحدد خط `Cairo` للتطبيق لضمان دعم اللغة العربية بشكل جيد.
```css
/* /home/user/asdf/public/style.css */
body {
    font-family: 'Cairo', sans-serif;
}
```

#### `/home/user/asdf/public/index.js`

* **الغرض:** يقوم بتصدير قائمة بجميع الوكلاء المتاحين في النظام.
* **تحليل تفصيلي:** يعمل كفهرس مركزي لوحدات الوكلاء، مما يسهل استيرادها في أجزاء أخرى من التطبيق.
```js
// /home/user/asdf/public/index.js
const storyArchitectAgent = require('./storyArchitect');
// ... (imports for all other agents)

const allAgents = [
    storyArchitectAgent,
    // ...
];

module.exports = {
    allAgents,
    // ...
};
```

#### `/home/user/asdf/public/script.js`

* **الغرض:** يحتوي على المنطق الرئيسي للواجهة الأمامية، ويدير تدفق واجهة المستخدم والتواصل مع الخادم.
* **تحليل تفصيلي:** يضيف مستمعي الأحداث (`event listeners`) إلى الأزرار، ويتحقق من صحة المدخلات، ويرسل طلبات `fetch` إلى نقطة النهاية `/api/start-session` في الواجهة الخلفية، ثم يعرض النتائج المستلمة.
```js
// /home/user/asdf/public/script.js
generateReportBtn.addEventListener('click', () => {
    // ... (validation checks)
    fetch('/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, dramaticTreatment }),
    })
    .then(handleFetchError)
    .then(data => {
        renderContextReport(data.context_report);
    })
    .catch(handleError);
});
```

---

### 2.3 الواجهة الخلفية (Rust)

#### `/home/user/asdf/src/main.rs`

* **الغرض:** نقطة الدخول (Entry Point) للتطبيق الخلفي باستخدام إطار عمل Axum.
* **تحليل تفصيلي:** يقوم بإنشاء خادم ويب، ويسجل المسارات (routes) مثل `/api/start-session`، ويخدم الملفات الثابتة من مجلد `public`. يستخدم `TraceLayer` لتسجيل الطلبات.
```rust
// /home/user/asdf/src/main.rs
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/start-session", post(start_session_handler))
        // ... (other routes)
        .merge(create_static_service())
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```
* **التبعيات/التفاعلات:** يستدعي `start_session_handler` الذي بدوره يستخدم `DramaticContextAgent`.

#### `/home/user/asdf/src/orchestrator.rs`

* **الغرض:** المنسق المركزي الذي يدير تدفق العمل الكامل لتطوير القصة عبر مراحل متعددة.
* **تحليل تفصيلي:** يحتوي على منطق معقد لتشغيل جلسات توليد الأفكار، بدءًا من "شرارة الإبداع"، مرورًا بالنقد والمراجعة، ثم "النقاش المنهجي"، وصولًا إلى "القرار النهائي وتعظيم القيمة".
```rust
// /home/user/asdf/src/orchestrator.rs
pub async fn run_ideation_session(prompt: &str) -> Result<String, AgentError> {
    // ... (المرحلة الأولى: شرارة الإبداع)
    let spark_agents: Vec<Box<dyn Agent + Send + Sync>> = vec![/* ... */];
    // ... (المرحلة الثانية: النقد البنّاء)
    let all_agents: Vec<Box<dyn Agent + Send + Sync>> = vec![/* ... */];
    // ... (المرحلة الثالثة: النقاش المنهجي)
    let debate_rounds = vec![/* ... */];
    // ... (المرحلة الرابعة: القرار النهائي)
    Ok(report)
}
```

#### `/home/user/asdf/src/language_model.rs`

* **الغرض:** يوفر طبقة تجريد (Abstraction Layer) للتفاعل مع Google's Generative Language API.
* **تحليل تفصيلي:** يحتوي على `struct` `LanguageModel` مع دالة `generate` غير متزامنة. تقوم هذه الدالة ببناء طلب HTTP POST إلى API، وتضمين مفتاح API، وإرسال الطلب، ثم تحليل الاستجابة لاستخراج النص الذي تم إنشاؤه.
```rust
// /home/user/asdf/src/language_model.rs
pub struct LanguageModel {
    client: Client,
}

impl LanguageModel {
    pub async fn generate(&self, prompt: &str, model_name: &str, api_key: &str) -> Result<String, ModelError> {
        let url = format!("{}{}:generateContent", API_BASE_URL, model_name.replace("models/", ""));
        // ... (request building and execution)
        let response_body: ResponseBody = response.json().await?;
        // ... (response parsing)
        Ok(text)
    }
}
```

#### `/home/user/asdf/src/dramatic_context_agent.md`

* **الغرض:** مستند توثيقي يشرح فلسفة ومهمة "وكيل تحليل السياق الدرامي".
* **تحليل تفصيلي:** يصف دور الوكيل في تفسير الفروق الدقيقة العاطفية والنبرة في القصة، معتبراً أن السياق هو ما يميز بين التراجيديا والكوميديا السوداء.
```md
# Dramatic Context Analysis Agent - Complete Development Guide

**Core Belief**: "Context is everything. The difference between tragedy and black comedy often lies not in the events themselves, but in the lens through which we view them..."
```

#### `/home/user/asdf/src/agents/mod.rs`

* **الغرض:** ملف تعريف الوحدة (Module Declaration) الذي يقوم بتجميع وتسجيل جميع وحدات الوكلاء الفردية.
* **تحليل تفصيلي:** يستخدم `pub mod <agent_name>;` لكل ملف وكيل، مما يجعلهم متاحين لبقية التطبيق من خلال مسار واحد.
```rust
// /home/user/asdf/src/agents/mod.rs
pub mod base_agent;
pub mod story_architect;
pub mod character_development;
// ... (all 14 agents listed)
pub mod dramatic_context_agent;
```

##### جدول الوكلاء (مُستخرَج فعليًا من محتوى المجلد أثناء التحليل)

| #  | الملف (.rs) | وصف سطر واحد (مستنتج من الاسم) | Structs/Traits رئيسية | دوال محورية |
|:--|:---|:---|:---|:---|
| 1 | audience_persona.rs | يحلل القصة من منظور الجمهور. | `AudiencePersonaAgent` | `execute()` |
| 2 | base_agent.rs | يحدد الواجهة المشتركة للوكلاء. | `trait Agent` | `execute()` |
| 3 | character_development.rs | يركز على تطوير الشخصيات. | `CharacterDevelopmentAgent` | `execute()` |
| 4 | character_expansion.rs | يقترح طرق لتوسيع الشخصيات. | `CharacterExpansionAgent` | `execute()` |
| 5 | conflict_tension.rs | يحلل بنية الصراع والتوتر. | `ConflictTensionAgent` | `execute()` |
| 6 | dialogue_voice.rs | يقيم جودة الحوار. | `DialogueVoiceAgent` | `execute()` |
| 7 | dramatic_context_agent.rs | يحلل السياق الدرامي والنبرة. | `DramaticContextAgent` | `execute()` |
| 8 | genre_tone.rs | يضمن توافق القصة مع نوعها. | `GenreToneAgent` | `execute()` |
| 9 | pacing.rs | يحلل إيقاع السرد. | `PacingAgent` | `execute()` |
| 10 | realism_critic.rs | ينقد واقعية ومنطقية الأحداث. | `RealismCriticAgent` | `critique()` |
| 11 | story_architect.rs | يبني الهيكل الأساسي للقصة. | `StoryArchitectAgent` | `structure()` |
| 12 | strategic_analyst.rs | يحلل القصة من منظور استراتيجي. | `StrategicAnalystAgent` | `analyze_strategy()` |
| 13 | theme.rs | يحلل ويحدد موضوع القصة. | `ThemeAgent` | `analyze_theme()` |
| 14 | world_building.rs | يركز على بناء وتماسك عالم القصة. | `WorldBuildingAgent` | `build()` |

*   **مسار:** `/home/user/asdf/src/agents/base_agent.rs`
    **الغرض:** يحدد الواجهة (`trait`) المشتركة لجميع الوكلاء.
    **تحليل تفصيلي:** يعرّف `trait Agent` الذي يتطلب من كل وكيل تنفيذ دوال مثل `name()` و `execute()`. هذا يضمن أن جميع الوكلاء لديهم هيكل وطريقة استدعاء متسقة.
    ```rust
    // /home/user/asdf/src/agents/base_agent.rs
    #[async_trait]
    pub trait Agent {
        fn name(&self) -> &'static str;
        fn model_name(&self) -> &str;
        fn api_key_name(&self) -> &str;
        async fn execute(&self, prompt: &str, llm: &LanguageModel) -> Result<String, AgentError>;
    }
    ```
    **التبعيات/التفاعلات:** كل وكيل آخر في المجلد سيقوم بتنفيذ هذا الـ `trait`.

---

### 2.4 إعدادات وبُنى البناء

#### `/home/user/asdf/Cargo.toml`

* **الغرض:** ملف توصيف (Manifest) لمشروع Rust. يحدد بيانات المشروع والتبعيات.
* **تحليل تفصيلي:** يعرّف الحزمة `rust_multi_agent_ideation` ويسرد تبعيات أساسية مثل `axum`, `tokio`, `serde`, `reqwest`, و `tracing`.
```toml
# /home/user/asdf/Cargo.toml
[package]
name = "rust_multi_agent_ideation"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower-http = { version = "0.5", features = ["fs", "trace"] }
serde = { version = "1.0", features = ["derive"] }
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
```

#### `/home/user/asdf/Cargo.lock`

* **الغرض:** يضمن بناء قابل للتكرار (Reproducible Builds) عن طريق قفل إصدارات محددة لكل تبعية.

#### `/home/user/asdf/.gitignore`

* **الغرض:** يحدد الملفات والمجلدات التي يجب أن يتجاهلها Git.
* **تحليل تفصيلي:** يستثني مجلد `/target` (مخرجات البناء) وملف `.env` (الأسرار).
```
/target
.env
```

#### `/home/user/asdf/.env`

* **الغرض:** تخزين متغيرات البيئة، وتحديداً مفاتيح API لكل وكيل.
* **تحليل تفصيلي:** يحتوي على مفاتيح API منفصلة لكل من الوكلاء الـ 13 والمنسق.
```
# /home/user/asdf/.env
ORCHESTRATOR_API_KEY="..."
AGENT_1_API_KEY="..." # AudiencePersonaAgent
AGENT_2_API_KEY="..." # CharacterDevelopmentAgent
# ... (and so on for all agents)
```

#### `/home/user/asdf/target`

* **الغرض:** يحتوي على جميع مخرجات عملية البناء التي ينتجها Cargo. **لا تحليل تفصيلي.**

---

## 3) خريطة التبعيات والتفاعلات

*   **وصف نصي:**
    1.  **`main.rs`** هو نقطة الدخول. يقوم بإنشاء خادم Axum وتوجيه الطلبات.
    2.  الطلبات إلى `/api/start-session` يتم التعامل معها بواسطة `start_session_handler` في `main.rs`.
    3.  هذا المعالج يستدعي **`dramatic_context_agent.rs`** لتحليل المدخلات الأولية.
    4.  المنطق الأكثر تعقيدًا موجود في **`orchestrator.rs`**، الذي يستدعي بشكل منهجي جميع الوكلاء الآخرين في **`src/agents/`** لتنفيذ مراحل متعددة من توليد الأفكار والمناقشة.
    5.  جميع الوكلاء، بما في ذلك المنسق، يستخدمون **`language_model.rs`** للتواصل مع Gemini API.

---

## 4) تعليمات التشغيل والبناء

*   **Cargo**:
    *   `cargo build`: لبناء المشروع.
    *   `cargo run`: لتشغيل الخادم المحلي على `127.0.0.1:3000`.
    *   `cargo test`: لتشغيل الاختبارات.
*   **Frontend**:
    *   الواجهة الأمامية يتم خدمتها تلقائيًا عند تشغيل الخادم. يمكن الوصول إليها من خلال المتصفح على `http://127.0.0.1:3000`.
*   **ENV**:
    *   يجب إنشاء ملف `.env` في جذر المشروع وتعبئته بـ 14 مفتاح API كما هو محدد في الملف.

---

## 5) إرشادات المساهمة والصيانة

*   **إضافة وكيل جديد:**
    1.  أنشئ ملف `.rs` جديد في `src/agents/`.
    2.  عرّف `struct` للوكيل الجديد واجعله ينفذ `trait Agent` من `base_agent.rs`.
    3.  أضف `pub mod new_agent;` إلى `src/agents/mod.rs`.
    4.  قم بدمج الوكيل الجديد في تدفق العمل داخل `orchestrator.rs`.

---

## 6) القيود المعروفة وخارطة الطريق

*   **قيود:** يعتمد النظام بشكل كبير على توفر وصحة 14 مفتاح API مختلف، مما قد يعقد عملية الإعداد.
*   **خارطة الطريق:**
    *   تنفيذ المنطق الكامل للواجهة الأمامية للتفاعل مع جميع مراحل المنسق.
    *   تحسين إدارة الأخطاء وإعطاء ملاحظات أوضح للمستخدم في الواجهة الأمامية.
    *   إضافة اختبارات تكامل لضمان عمل تدفق عمل المنسق بأكمله بشكل صحيح.
