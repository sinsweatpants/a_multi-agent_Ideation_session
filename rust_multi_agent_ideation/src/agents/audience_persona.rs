use async_trait::async_trait;
use super::base_agent::{Agent, BaseAgent};
use crate::language_model::LanguageModel;

pub struct AudiencePersonaAgent {
    base: BaseAgent,
    personas: Vec<String>,
}

impl AudiencePersonaAgent {
    pub fn new() -> Self {
        Self {
            base: BaseAgent::new("Audience Persona"),
            personas: vec![
                "مراهق محب للخيال العلمي".to_string(),
                "مشاهد بالغ يفضّل الدراما الواقعية".to_string(),
                "هاوٍ لأفلام الجريمة النفسية".to_string(),
                "مشاهِدة تهتم بسرد شخصيات نسوية قوية".to_string(),
                "محبّ للأنثولوجيا والتجريب الشكلي".to_string(),
            ],
        }
    }
}

#[async_trait]
impl Agent for AudiencePersonaAgent {
    fn name(&self) -> &str {
        self.base.name()
    }

    async fn execute(&self, prompt: &str, llm: &LanguageModel) -> String {
        let system_prompt = "أنت \\\"صوت الجمهور\\\". تحاكي بدقّة تفضيلات شريحة جمهور محددة، وتكتب بالعربية.";
        
        let full_prompt = format!("{}

Input: {}

Personas: {:?}", system_prompt, prompt, self.personas);

        llm.generate(&full_prompt).await.unwrap_or_else(|e| {
            eprintln!("Error generating response: {}", e);
            "Error generating response".to_string()
        })
    }
}
