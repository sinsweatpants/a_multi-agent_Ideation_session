use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct ThemeAgent {
    base: BaseAgent,
}

impl ThemeAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Theme"),
        }
    }
}

#[async_trait]
impl Agent for ThemeAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        format!("Developing the theme for: {}", prompt)
    }
}
