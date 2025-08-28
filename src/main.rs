#![allow(dead_code)]
use axum::{
    routing::{get_service, post},
    Router,
    Json,
    http::StatusCode,
    response::{Response, IntoResponse},
};
use std::net::SocketAddr;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use serde::{Deserialize, Serialize};
use crate::agents::base_agent::AgentError;

mod orchestrator;
mod agents;
mod language_model;

#[derive(Deserialize, Debug)]
struct ApiKeyRequest {
    #[serde(rename = "apiKey")]
    api_key: String,
    #[serde(rename = "creativeBrief")]
    creative_brief: String,
}

#[derive(Serialize, Debug)]
struct SessionResponse {
    #[serde(rename = "sessionId")]
    session_id: String,
    loglines: Vec<Logline>,
}

#[derive(Serialize, Debug, Clone)]
struct Logline {
    id: String,
    #[serde(rename = "sourceAgent")]
    source_agent: String,
    #[serde(rename = "text_ar")]
    text_ar: String,
}

#[derive(Deserialize, Debug)]
struct SelectIdeasRequest {
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "chosenLoglines")]
    chosen_loglines: Vec<String>,
}

#[derive(Deserialize, Debug)]
struct StageRequest {
    #[serde(rename = "sessionId")]
    session_id: String,
    // We can add other fields as needed for specific stages
}


#[derive(Serialize, Debug)]
struct FinalReport {
    // Define the structure of the final report based on what the frontend expects
    // This is a placeholder structure
    hybrid_idea: DummyIdea,
    coordinator_decision: DummyDecision,
    salvage_analysis: Vec<DummySalvage>,
    stress_test: DummyStressTest,
    debate: Option<DummyDebate>,
    audience_persona_review: Option<DummyAudience>,
}

#[derive(Serialize, Debug)]
struct DummyIdea {
    #[serde(rename = "sourceAgent")]
    source_agent: String,
    #[serde(rename = "text_ar")]
    text_ar: String,
}

#[derive(Serialize, Debug)]
struct DummyDecision {
    winner: String,
    #[serde(rename = "justification_ar")]
    justification_ar: String,
}

#[derive(Serialize, Debug)]
struct DummySalvage {
    #[serde(rename = "recommendations_ar")]
    recommendations_ar: Vec<String>,
}

#[derive(Serialize, Debug)]
struct DummyStressTest {
    #[serde(rename = "mitigations_ar")]
    mitigations_ar: Vec<String>,
}

#[derive(Serialize, Debug)]
struct DummyDebate {
    rounds: Vec<String>, // Simplified
}

#[derive(Serialize, Debug)]
struct DummyAudience {
    persona: String,
    vote_for: String,
    #[serde(rename = "rationale_ar")]
    rationale_ar: String,
}


#[derive(Serialize, Debug)]
struct SelectIdeasResponse {
    #[serde(rename = "finalReport")]
    final_report: FinalReport,
}

#[derive(Serialize, Debug)]
struct StageResponse {
     #[serde(rename = "finalReport")]
    final_report: FinalReport,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// This will be our single top-level error type.
enum AppError {
    Agent(AgentError),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            // We now properly handle the AgentError variant
            AppError::Agent(err) => (StatusCode::INTERNAL_SERVER_ERROR, format!("An error occurred in the agent pipeline: {}", err)),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

// This is the crucial implementation that fixes the error.
// It tells Axum how to convert an AgentError into our AppError.
impl From<AgentError> for AppError {
    fn from(err: AgentError) -> Self {
        AppError::Agent(err)
    }
}

async fn start_session_handler(Json(payload): Json<ApiKeyRequest>) -> Result<Json<SessionResponse>, AppError> {
    // In a real app, you'd validate the API key and create a session.
    // Here, we'll just log it and return a dummy response.
    tracing::debug!("Starting session with key for brief: {}", payload.creative_brief);
    let response = SessionResponse {
        session_id: "dummy-session-123".to_string(),
        loglines: vec![
            Logline { id: "1".to_string(), source_agent: "وكيل الخيال العلمي".to_string(), text_ar: "فكرة أولى مثيرة للاهتمام من وكيل الخيال العلمي.".to_string() },
            Logline { id: "2".to_string(), source_agent: "وكيل الكوميديا".to_string(), text_ar: "فكرة ثانية مضحكة من وكيل الكوميديا.".to_string() },
            Logline { id: "3".to_string(), source_agent: "وكيل الدراما".to_string(), text_ar: "فكرة ثالثة درامية من وكيل الدراما.".to_string() },
        ],
    };
    Ok(Json(response))
}

async fn select_ideas_handler(Json(payload): Json<SelectIdeasRequest>) -> Result<Json<SelectIdeasResponse>, AppError> {
    tracing::debug!("Selecting ideas for session {}: {:?}", payload.session_id, payload.chosen_loglines);
    let response = SelectIdeasResponse {
        final_report: FinalReport {
            hybrid_idea: DummyIdea { source_agent: "المنسق (فكرة هجينة)".to_string(), text_ar: "هذه هي الفكرة الهجينة التي تم إنشاؤها.".to_string() },
            coordinator_decision: DummyDecision { winner: "".to_string(), justification_ar: "".to_string() },
            salvage_analysis: vec![],
            stress_test: DummyStressTest { mitigations_ar: vec![] },
            debate: None,
            audience_persona_review: None,
        }
    };
    Ok(Json(response))
}

async fn debate_handler(Json(payload): Json<StageRequest>) -> Result<Json<StageResponse>, AppError> {
    tracing::debug!("Running debate for session {}", payload.session_id);
    // This would run the debate logic
    let response = StageResponse {
        final_report: FinalReport {
            hybrid_idea: DummyIdea { source_agent: "المنسق (فكرة هجينة)".to_string(), text_ar: "هذه هي الفكرة الهجينة التي تم إنشاؤها.".to_string() },
            coordinator_decision: DummyDecision { winner: "".to_string(), justification_ar: "".to_string() },
            salvage_analysis: vec![],
            stress_test: DummyStressTest { mitigations_ar: vec![] },
            debate: Some(DummyDebate { rounds: vec!["جولة نقاش أولى".to_string()] }),
            audience_persona_review: None,
        }
    };
    Ok(Json(response))
}

async fn audience_handler(Json(payload): Json<StageRequest>) -> Result<Json<StageResponse>, AppError> {
    tracing::debug!("Running audience persona for session {}", payload.session_id);
    // This would run the audience persona logic
     let response = StageResponse {
        final_report: FinalReport {
            hybrid_idea: DummyIdea { source_agent: "المنسق (فكرة هجينة)".to_string(), text_ar: "هذه هي الفكرة الهجينة التي تم إنشاؤها.".to_string() },
            coordinator_decision: DummyDecision { winner: "".to_string(), justification_ar: "".to_string() },
            salvage_analysis: vec![],
            stress_test: DummyStressTest { mitigations_ar: vec![] },
            debate: Some(DummyDebate { rounds: vec!["جولة نقاش أولى".to_string()] }),
            audience_persona_review: Some(DummyAudience { persona: "الناقد المتشكك".to_string(), vote_for: "الفكرة 1".to_string(), rationale_ar: "هذه الفكرة لديها أكبر إمكانات تجارية.".to_string() }),
        }
    };
    Ok(Json(response))
}

async fn decide_handler(Json(payload): Json<StageRequest>) -> Result<Json<StageResponse>, AppError> {
    tracing::debug!("Running final decision for session {}", payload.session_id);
    // This would run the final decision logic
    let response = StageResponse {
        final_report: FinalReport {
            hybrid_idea: DummyIdea { source_agent: "المنسق (فكرة هجينة)".to_string(), text_ar: "هذه هي الفكرة الهجينة التي تم إنشاؤها.".to_string() },
            coordinator_decision: DummyDecision { winner: "الفكرة 3 (الهجينة)".to_string(), justification_ar: "تم اختيار الفكرة الهجينة لأنها تجمع أفضل عناصر الفكرتين الأخريين.".to_string() },
            salvage_analysis: vec![DummySalvage { recommendations_ar: vec!["استخدام شخصية من الفكرة 1".to_string()] }],
            stress_test: DummyStressTest { mitigations_ar: vec!["خطة التخفيف لاختبار الإجهاد.".to_string()] },
            debate: Some(DummyDebate { rounds: vec!["جولة نقاش أولى".to_string()] }),
            audience_persona_review: Some(DummyAudience { persona: "الناقد المتشكك".to_string(), vote_for: "الفكرة 1".to_string(), rationale_ar: "هذه الفكرة لديها أكبر إمكانات تجارية.".to_string() }),
        }
    };
    Ok(Json(response))
}

fn create_static_service() -> Router {
    Router::new().nest_service("/", get_service(ServeDir::new("public")))
}

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    // build our application with a route
    let app = Router::new()
        .route("/api/start-session", post(start_session_handler))
        .route("/api/select-ideas", post(select_ideas_handler))
        .route("/api/debate", post(debate_handler))
        .route("/api/audience", post(audience_handler))
        .route("/api/decide", post(decide_handler))
        .merge(create_static_service())
        .layer(TraceLayer::new_for_http());

    // run our app with hyper
    // `axum::Server` is a re-export of `hyper::Server`
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("listening on {}", addr);
    // The unwrap here is okay for an example, but in production, this should be handled.
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
