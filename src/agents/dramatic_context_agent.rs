use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::agents::base_agent::{Agent, AgentError};
use crate::language_model::LanguageModel;

// Defines the structure of the expected report from the language model.
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DramaticContextReport {
    pub tonal_microscopy: String,
    pub emotional_subtext: String,
    pub key_dramatic_questions: Vec<String>,
    pub recommended_agents: Vec<String>, 
}

pub struct DramaticContextAgent;

impl DramaticContextAgent {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Agent for DramaticContextAgent {
    fn name(&self) -> &'static str {
        "Dramatic Context"
    }

    fn model_name(&self) -> &str {
        "models/gemini-2.5-pro"
    }

    fn api_key_name(&self) -> &str {
        "AGENT_13_API_KEY"
    }

    async fn execute(&self, dramatic_treatment: &str, llm: &LanguageModel) -> Result<String, AgentError> {
        // We need to add a specific instruction to the end of the detailed prompt 
        // to ensure the model returns JSON.
        let final_prompt = format!(
            r#"Analyze the following dramatic treatment and provide a JSON response with exactly these fields:

Required JSON format:
{{
    "tonal_microscopy": "detailed analysis of subtle tonal elements and word choices",
    "emotional_subtext": "underlying emotional currents beneath the surface narrative",
    "key_dramatic_questions": ["question1", "question2", "question3"],
    "recommended_agents": ["agent1", "agent2", "agent3"]
}}

Guidelines:
- tonal_microscopy: Analyze word choices, phrasing, and implications that reveal dramatic intent
- emotional_subtext: Decode emotional currents beneath narrative elements  
- key_dramatic_questions: 3-5 critical questions this story must answer
- recommended_agents: 3-5 agents that would be most valuable for developing this story

Your output MUST be valid JSON only. No additional text, markdown, or explanations.

**Dramatic Treatment:**
{}"#,
            dramatic_treatment
        );

        // --- Start Temporary Debugging ---
        tracing::info!("Attempting to get API key: {}", self.api_key_name());
        tracing::info!("Result of env::var: {:?}", std::env::var(self.api_key_name()));
        // --- End Temporary Debugging ---
        let api_key = crate::agents::base_agent::BaseAgent::get_api_key(self.api_key_name())?;
        Ok(llm.generate(&final_prompt, self.model_name(), &api_key).await?)
    }
}
