#![allow(dead_code)]
use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ModelError {
    #[error("Network request failed: {0}")]
    Network(#[from] reqwest::Error),
    #[error("API error: {0}")]
    Api(String),
}

const API_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/";

#[derive(Serialize)]
struct RequestBody<'a> {
    contents: Vec<Content<'a>>,
}

#[derive(Serialize)]
struct Content<'a> {
    parts: Vec<Part<'a>>,
}

#[derive(Serialize)]
struct Part<'a> {
    text: &'a str,
}

#[derive(Deserialize, Debug)]
struct ResponseBody {
    candidates: Option<Vec<Candidate>>,
    // Add a field for potential errors in the response body
    error: Option<ApiError>,
}

#[derive(Deserialize, Debug)]
struct ApiError {
    message: String,
}


#[derive(Deserialize, Debug)]
struct Candidate {
    content: ContentResponse,
}

#[derive(Deserialize, Debug)]
struct ContentResponse {
    parts: Vec<PartResponse>,
}

#[derive(Deserialize, Debug)]
struct PartResponse {
    text: String,
}

pub struct LanguageModel {
    client: Client,
}

impl LanguageModel {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(90))
                .build()
                .unwrap(),
        }
    }

    pub async fn generate(&self, prompt: &str, model_name: &str, api_key: &str) -> Result<String, ModelError> {
        let url = format!("{}{}:generateContent", API_BASE_URL, model_name.replace("models/", ""));

        let request_body = RequestBody {
            contents: vec![Content {
                parts: vec![Part {
                    text: prompt,
                }],
            }],
        };

        let response = self
            .client
            .post(&url)
            .query(&[("key", api_key)])
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();
        let response_body_text = response.text().await?;

        if !status.is_success() {
            return Err(ModelError::Api(format!(
                "API request failed with status {}: {}",
                status, response_body_text
            )));
        }

        let response_body: ResponseBody = serde_json::from_str(&response_body_text)
            .map_err(|e| ModelError::Api(format!("Failed to parse successful API response: {}. Body: {}", e, response_body_text)))?;

        if let Some(api_error) = response_body.error {
             return Err(ModelError::Api(api_error.message));
        }

        let text = response_body
            .candidates
            .and_then(|mut c| c.pop())
            .and_then(|c| c.content.parts.into_iter().next())
            .map(|p| p.text)
            .ok_or_else(|| ModelError::Api("API response did not contain any valid candidates.".to_string()))?;

        Ok(text)
    }
}
