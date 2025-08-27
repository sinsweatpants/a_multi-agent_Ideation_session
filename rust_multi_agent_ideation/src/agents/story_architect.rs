
use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct StoryArchitectAgent {
    base: BaseAgent,
}

impl StoryArchitectAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Story Architect"),
        }
    }
}

#[async_trait]
impl Agent for StoryArchitectAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        // This is a simplified version of the original agent's logic.
        // We can add more complex logic later.
        format!("As the Story Architect, I will build a compelling narrative structure for: {}", prompt)
    }
}
