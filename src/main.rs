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
use tower_http::cors::{CorsLayer, Any};
use serde::{Deserialize, Serialize};
use crate::agents::base_agent::{AgentError};

mod orchestrator;
mod agents;
mod language_model;

#[derive(Deserialize, Debug)]
struct IdeationRequest {
    #[serde(rename = "dramaticTreatment")]
    dramatic_treatment: String,
}

#[derive(Serialize)]
struct IdeationResponse {
    report: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

enum AppError {
    Agent(AgentError),
    Json(serde_json::Error),
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

async fn ideation_handler(Json(payload): Json<IdeationRequest>) -> Result<Json<IdeationResponse>, AppError> {
    tracing::info!("Received new ideation session request with treatment: {}", payload.dramatic_treatment);
    
    match orchestrator::run_ideation_session(&payload.dramatic_treatment).await {
        Ok(report) => {
            tracing::info!("Ideation session completed successfully");
            Ok(Json(IdeationResponse { report }))
        },
        Err(e) => {
            tracing::error!("Ideation session failed: {:?}", e);
            Err(AppError::Agent(e))
        }
    }
}

fn create_static_service() -> Router {
    Router::new().nest_service("/", get_service(ServeDir::new("public")))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/api/start-session", post(ideation_handler))
        .merge(create_static_service())
        .layer(CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any))
        .layer(TraceLayer::new_for_http());

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse::<u16>().unwrap_or(3000);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing::debug!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
