use axum::{
    routing::{get_service, post},
    Router,
    Json,
    http::StatusCode,
    response::{Response, IntoResponse},
};
use std::net::SocketAddr;
use tower_http::services::ServeDir;
use serde::{Deserialize, Serialize};
use crate::agents::base_agent::AgentError;

mod orchestrator;
mod agents;
mod language_model;

#[derive(Deserialize)]
struct GenerationRequest {
    prompt: String,
}

#[derive(Serialize)]
struct GenerationResponse {
    response: String,
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

async fn generate_handler(Json(payload): Json<GenerationRequest>) -> Result<Json<GenerationResponse>, AppError> {
    let response_text = orchestrator::run_ideation_session(&payload.prompt).await?;
    let response = GenerationResponse {
        response: response_text,
    };
    Ok(Json(response))
}


#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    // build our application with a route
    let app = Router::new()
        .route("/api/generate", post(generate_handler))
        .nest_service("/", get_service(ServeDir::new("public")));

    // run our app with hyper
    // `axum::Server` is a re-export of `hyper::Server`
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("listening on {}", addr);
    // The unwrap here is okay for an example, but in production, this should be handled.
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
