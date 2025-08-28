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
use crate::agents::base_agent::{Agent, AgentError};
use crate::agents::dramatic_context_agent::DramaticContextAgent;
use crate::language_model::LanguageModel;


mod orchestrator;
mod agents;
mod language_model;

// Renamed to reflect the new input type
#[derive(Deserialize, Debug)]
struct ApiKeyRequest {
    #[serde(rename = "apiKey")]
    api_key: String,
    #[serde(rename = "dramaticTreatment")]
    dramatic_treatment: String,
}

// Updated to return the context report
#[derive(Serialize, Debug)]
struct SessionResponse {
    #[serde(rename = "sessionId")]
    session_id: String,
    context_report: serde_json::Value, // The report from the Dramatic Context Agent
}

// The following structs are kept for potential future use in the debate stage,
// but the initial idea generation flow is changing.
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
}


#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

enum AppError {
    Agent(AgentError),
    Json(serde_json::Error), // Added to handle JSON errors
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Agent(err) => (StatusCode::INTERNAL_SERVER_ERROR, format!("An error occurred in the agent pipeline: {}", err)),
            AppError::Json(err) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to process JSON data: {}", err)),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

impl From<AgentError> for AppError {
    fn from(err: AgentError) -> Self {
        AppError::Agent(err)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Json(err)
    }
}

// The main handler for the new workflow
async fn start_session_handler(Json(payload): Json<ApiKeyRequest>) -> Result<Json<SessionResponse>, AppError> {
    tracing::debug!("Starting session with treatment: {}", payload.dramatic_treatment);

    // 1. Initialize the Dramatic Context Agent
    // Note: API key is passed from the user, but in a real app, this would be handled securely.
    let context_agent = DramaticContextAgent {
        model: LanguageModel::new("models/gemini-2.5-flash-image-preview", &payload.api_key),
    };

    // 2. Execute the agent with the provided dramatic treatment
    let agent_output = context_agent.execute(&payload.dramatic_treatment).await?;

    // 3. Parse the detailed report from the agent's output
    let report_json: serde_json::Value = serde_json::from_str(&agent_output.details)?;

    // TODO: In the next step, we would extract 'recommended_agents' from the report_json
    // and then execute those agents. For now, we return the report.

    tracing::debug!("Generated context report: {:?}", report_json);

    let response = SessionResponse {
        session_id: "dummy-session-123".to_string(),
        context_report: report_json,
    };

    Ok(Json(response))
}

// This function is now obsolete with the new workflow but kept for reference.
async fn select_ideas_handler_disabled() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "This endpoint is disabled in the new workflow.")
}


fn create_static_service() -> Router {
    Router::new().nest_service("/", get_service(ServeDir::new("public")))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/api/start-session", post(start_session_handler))
        // The old endpoints are effectively disabled.
        .route("/api/select-ideas", post(select_ideas_handler_disabled))
        .route("/api/debate", post(select_ideas_handler_disabled))
        .route("/api/audience", post(select_ideas_handler_disabled))
        .route("/api/decide", post(select_ideas_handler_disabled))
        .merge(create_static_service())
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
