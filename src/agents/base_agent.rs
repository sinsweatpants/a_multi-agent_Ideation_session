#![allow(dead_code)]
use async_trait::async_trait;
use crate::language_model::{LanguageModel, ModelError};
use std::env;

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Language model error: {0}")]
    ModelError(#[from] ModelError),
    #[error("API key not found for agent: {0}")]
    ApiKeyNotFound(String),
    #[error("Failed to parse data: {0}")]
    ParsingError(String),
}

#[async_trait]
pub trait Agent {
    fn name(&self) -> &'static str;
    fn model_name(&self) -> &str;
    fn api_key_name(&self) -> &str;
    async fn execute(&self, prompt: &str, llm: &LanguageModel) -> Result<String, AgentError>;
}

pub struct BaseAgent;

impl BaseAgent {
    pub fn get_api_key(key_name: &str) -> Result<String, AgentError> {
        env::var(key_name).map_err(|_| AgentError::ApiKeyNotFound(key_name.to_string()))
    }
}
