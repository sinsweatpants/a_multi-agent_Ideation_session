use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent, AgentError};
use crate::language_model::LanguageModel;

pub struct AudiencePersonaAgent {
    base: BaseAgent,
}

impl AudiencePersonaAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Audience Persona"),
        }
    }

    fn get_system_prompt() -> &'static str {
        r#"# Audience Persona Agent - Complete Development Guide
... (content is unchanged)
"#
    }
}

#[async_trait]
impl Agent for AudiencePersonaAgent {
    fn name(&self) -> &str {
        &self.base.name
    }
    
    fn model_name(&self) -> &str {
        "models/gemini-1.5-pro"
    }
    
    fn api_key_name(&self) -> &str {
        "AGENT_1_API_KEY"
    }

    async fn execute(&self, prompt: &str, llm: &LanguageModel) -> Result<String, AgentError> {
        let api_key = BaseAgent::get_api_key(self.api_key_name())?;
        let system_prompt = Self::get_system_prompt();
        let full_prompt = format!("{}

---

**User Request:**
{}", system_prompt, prompt);

        Ok(llm.generate(&full_prompt, self.model_name(), &api_key).await?)
    }
}
