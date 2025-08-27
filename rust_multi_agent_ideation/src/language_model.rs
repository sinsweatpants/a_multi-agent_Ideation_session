use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

const API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

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
    candidates: Vec<Candidate>,
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
    api_key: String,
}

impl LanguageModel {
    pub fn new() -> Self {
        dotenv::dotenv().ok();
        let api_key = env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY must be set");
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, reqwest::Error> {
        let request_body = RequestBody {
            contents: vec![Content {
                parts: vec![Part {
                    text: prompt.to_string(),
                }],
            }],
        };

        let response = self
            .client
            .post(API_URL)
            .query(&[("key", &self.api_key)])
            .json(&request_body)
            .send()
            .await?;

        let response_body: ResponseBody = response.json().await?;

        Ok(response_body.candidates[0].content.parts[0].text.clone())
    }
}
