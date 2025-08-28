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

enum AppError {
    ModelError(language_model::ModelError),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::ModelError(err) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Language Model Error: {}", err)),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

impl From<language_model::ModelError> for AppError {
    fn from(err: language_model::ModelError) -> Self {
        AppError::ModelError(err)
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
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
