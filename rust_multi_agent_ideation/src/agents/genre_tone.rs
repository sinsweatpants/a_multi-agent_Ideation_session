use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};

pub struct GenreToneAgent {
    base: BaseAgent,
}

impl GenreToneAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Genre & Tone Analyst"),
        }
    }
}

#[async_trait]
impl Agent for GenreToneAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str) -> String {
        // نسخة مبسطة من منطق الوكيل الأصلي
        format!("As the Genre & Tone Analyst, I will establish a consistent genre and tone for: {}", prompt)
    }
}
