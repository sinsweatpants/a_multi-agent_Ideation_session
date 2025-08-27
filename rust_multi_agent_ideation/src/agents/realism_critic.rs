use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct RealismCriticAgent {
    base: BaseAgent,
}

impl RealismCriticAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Realism Critic"),
        }
    }
}

#[async_trait]
impl Agent for RealismCriticAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        format!("Critiquing the realism of: {}", prompt)
    }
}
