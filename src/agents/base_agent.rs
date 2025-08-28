use async_trait::async_trait;
use crate::language_model::{LanguageModel, ModelError};
use std::env;

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Language model error: {0}")]
    ModelError(#[from] ModelError),
    #[error("API key not found for agent: {0}")]
    ApiKeyNotFound(String),
}

#[async_trait]
pub trait Agent {
    fn name(&self) -> &str;
    fn model_name(&self) -> &str;
    fn api_key_name(&self) -> &str;
    async fn execute(&self, prompt: &str, llm: &LanguageModel) -> Result<String, AgentError>;
}

pub struct BaseAgent {
    pub name: String,
}

impl BaseAgent {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
        }
    }

    pub fn get_api_key(key_name: &str) -> Result<String, AgentError> {
        env::var(key_name).map_err(|_| AgentError::ApiKeyNotFound(key_name.to_string()))
    }
}
