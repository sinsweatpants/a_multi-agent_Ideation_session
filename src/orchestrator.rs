use crate::agents::base_agent::{Agent, AgentError};
use crate::agents::story_architect::StoryArchitectAgent;
use crate::agents::genre_tone::GenreToneAgent;
use crate::agents::character_development::CharacterDevelopmentAgent;
use crate::agents::world_building::WorldBuildingAgent;
use crate::agents::conflict_tension::ConflictTensionAgent;
use crate::agents::pacing::PacingAgent;
use crate::agents::dialogue_voice::DialogueVoiceAgent;
use crate::agents::theme::ThemeAgent;
use crate::agents::character_expansion::CharacterExpansionAgent;
use crate::agents::realism_critic::RealismCriticAgent;
use crate::agents::strategic_analyst::StrategicAnalystAgent;
use crate::agents::audience_persona::AudiencePersonaAgent;
use crate::language_model::LanguageModel;

pub async fn run_ideation_session(prompt: &str) -> Result<String, AgentError> {
    dotenv::dotenv().ok();
    let llm = LanguageModel::new();

    let agents: Vec<Box<dyn Agent + Send + Sync>> = vec![
        Box::new(StoryArchitectAgent::new()),
        Box::new(GenreToneAgent::new()),
        Box::new(CharacterDevelopmentAgent::new()),
        Box::new(WorldBuildingAgent::new()),
        Box::new(ConflictTensionAgent::new()),
        Box::new(PacingAgent::new()),
        Box::new(DialogueVoiceAgent::new()),
        Box::new(ThemeAgent::new()),
        Box::new(CharacterExpansionAgent::new()),
        Box::new(RealismCriticAgent::new()),
        Box::new(StrategicAnalystAgent::new()),
        Box::new(AudiencePersonaAgent::new()),
    ];

    let mut current_prompt = prompt.to_string();

    for agent in agents {
        current_prompt = agent.execute(&current_prompt, &llm).await?;
    }

    Ok(current_prompt)
}
