use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct CharacterExpansionAgent {
    base: BaseAgent,
}

impl CharacterExpansionAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Character Expansion"),
        }
    }
}

#[async_trait]
impl Agent for CharacterExpansionAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        format!("Expanding characters for: {}", prompt)
    }
}
