use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ModelError {
    #[error("Request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("Failed to parse response or no candidates found")]
    ResponseParseError,
}

const API_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/";

#[derive(Serialize)]
struct RequestBody {
    contents: Vec<Content>,
}

#[derive(Serialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Serialize)]
struct Part {
    text: String,
}

#[derive(Deserialize)]
struct ResponseBody {
    candidates: Option<Vec<Candidate>>,
}

#[derive(Deserialize)]
struct Candidate {
    content: ContentResponse,
}

#[derive(Deserialize)]
struct ContentResponse {
    parts: Vec<PartResponse>,
}

#[derive(Deserialize)]
struct PartResponse {
    text: String,
}

pub struct LanguageModel {
    client: Client,
}

impl LanguageModel {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn generate(&self, prompt: &str, model_name: &str, api_key: &str) -> Result<String, ModelError> {
        let url = format!("{}{}:generateContent", API_BASE_URL, model_name.replace("models/", ""));

        let request_body = RequestBody {
            contents: vec![Content {
                parts: vec![Part {
                    text: prompt.to_string(),
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

        if !response.status().is_success() {
            return Err(ModelError::RequestError(response.error_for_status().unwrap_err()));
        }

        let response_body: ResponseBody = response.json().await?;

        let text = response_body
            .candidates
            .and_then(|mut c| c.pop())
            .and_then(|c| c.content.parts.into_iter().next())
            .map(|p| p.text)
            .ok_or(ModelError::ResponseParseError)?;

        Ok(text)
    }
}
