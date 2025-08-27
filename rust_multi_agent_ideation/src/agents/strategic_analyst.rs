use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct StrategicAnalystAgent {
    base: BaseAgent,
}

impl StrategicAnalystAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Strategic Analyst"),
        }
    }
}

#[async_trait]
impl Agent for StrategicAnalystAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        format!("Analyzing the strategy of: {}", prompt)
    }
}
