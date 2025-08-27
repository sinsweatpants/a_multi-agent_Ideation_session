use async_trait::async_trait;
use crate::language_model::LanguageModel;

#[async_trait]
pub trait Agent {
    fn name(&self) -> &str;
    async fn execute(&self, prompt: &str, llm: &LanguageModel) -> String;
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
}
