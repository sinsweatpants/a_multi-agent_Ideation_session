use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct DialogueVoiceAgent {
    base: BaseAgent,
}

impl DialogueVoiceAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Dialogue & Voice"),
        }
    }
}

#[async_trait]
impl Agent for DialogueVoiceAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        format!("Writing dialogue for: {}", prompt)
    }
}
