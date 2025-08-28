use crate::agents::base_agent::{Agent, AgentError};
use crate::agents::dramatic_context_agent::{DramaticContextAgent, DramaticContextReport};
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
use futures::future::join_all;
use serde_json;
use rand::seq::SliceRandom;
use std::sync::Arc;

// Helper function to extract a JSON object from a larger string
fn extract_json_from_response(response: &str) -> Option<&str> {
    let start_brace = response.find('{');
    let end_brace = response.rfind('}');

    if let (Some(start), Some(end)) = (start_brace, end_brace) {
        if end > start {
            return Some(&response[start..=end]);
        }
    }
    None
}

// Represents a story idea with its creator
struct Idea {
    name: String,
    content: String,
    creator_name: String,
    creator_instance: Box<dyn Agent + Send + Sync>,
}

// Defines a round for the systematic debate
struct DebateRound<'a> {
    topic: &'a str,
    agent_a_name: &'a str,
    agent_b_name: &'a str,
}

// Helper to get an agent instance from its name
fn get_agent_instance_by_name(name: &str) -> Option<Box<dyn Agent + Send + Sync>> {
    match name {
        "Story Architect" => Some(Box::new(StoryArchitectAgent::new())),
        "Genre & Tone" => Some(Box::new(GenreToneAgent::new())),
        "Character Development" => Some(Box::new(CharacterDevelopmentAgent::new())),
        "World Building" => Some(Box::new(WorldBuildingAgent::new())),
        "Conflict & Tension" => Some(Box::new(ConflictTensionAgent::new())),
        "Pacing" => Some(Box::new(PacingAgent::new())),
        "Dialogue & Voice" => Some(Box::new(DialogueVoiceAgent::new())),
        "Theme" => Some(Box::new(ThemeAgent::new())),
        "Character Expansion" => Some(Box::new(CharacterExpansionAgent::new())),
        "Realism Critic" => Some(Box::new(RealismCriticAgent::new())),
        "Strategic Analyst" => Some(Box::new(StrategicAnalystAgent::new())),
        "Audience Persona" => Some(Box::new(AudiencePersonaAgent::new())),
        "Dramatic Context" => Some(Box::new(DramaticContextAgent::new())),
        _ => None,
    }
}

pub async fn run_ideation_session(dramatic_treatment: &str) -> Result<String, AgentError> {
    dotenv::dotenv().ok();
    let llm = Arc::new(LanguageModel::new());
    let mut report = String::new();

    // =======================================================================================
    // المرحلة الأولى: تحليل السياق واختيار الوكلاء وتوليد الأفكار
    // =======================================================================================
    report.push_str("# المرحلة الأولى: تحليل السياق، اختيار الوكلاء، وتوليد الأفكار\n\n");

    let context_agent = DramaticContextAgent::new();
    let raw_context_response = context_agent.execute(dramatic_treatment, &llm).await?;
    let context_report_json = extract_json_from_response(&raw_context_response)
        .ok_or_else(|| AgentError::ParsingError("Could not find a valid JSON object in the model's response.".to_string()))?;
    
    let context_report: DramaticContextReport = serde_json::from_str(context_report_json)
        .map_err(|e| AgentError::ParsingError(format!("Failed to parse extracted JSON: {}", e)))?;

    report.push_str("## تقرير السياق الدرامي\n");
    report.push_str(&format!("- **الفحص المجهري للنبرة:** {}\n", context_report.tonal_microscopy));
    report.push_str(&format!("- **النص الفرعي العاطفي:** {}\n", context_report.emotional_subtext));
    report.push_str(&format!("- **الأسئلة الدرامية الرئيسية:** {:?}\n", context_report.key_dramatic_questions));
    report.push_str(&format!("- **الوكلاء الموصى بهم:** {:?}\n\n", context_report.recommended_agents));

    let selected_agent_names = context_report.recommended_agents.clone();
    let mut idea_futures = Vec::new();
    for agent_name in &selected_agent_names {
        if let Some(agent) = get_agent_instance_by_name(agent_name) {
            let prompt = format!(
                "Based on the following dramatic treatment and context report, generate a single, compelling logline or core concept from your unique perspective as the {}.\n\n**Dramatic Treatment:**\n{}\n\n**Context Report:**\n{}",
                agent.name(), dramatic_treatment, context_report_json
            );
            let agent_name_clone = agent_name.clone();
            let llm_clone = Arc::clone(&llm);
            idea_futures.push(async move { 
                let res = agent.execute(&prompt, &llm_clone).await;
                (agent_name_clone, res)
            });
        }
    }

    let initial_ideas_results = join_all(idea_futures).await;
    let mut initial_ideas = Vec::new();
    report.push_str("## الشرارات الإبداعية الأولية\n");
    for (agent_name, result) in initial_ideas_results {
        let content = result.unwrap_or_else(|e| format!("Error: {}", e));
        report.push_str(&format!("### فكرة من وكيل '{}':\n{}\n\n", agent_name, content));
        initial_ideas.push(Idea {
            name: format!("Idea from {}", agent_name),
            content: content,
            creator_name: agent_name.clone(),
            creator_instance: get_agent_instance_by_name(&agent_name).unwrap(),
        });
    }

    // =======================================================================================
    // المرحلة الثانية: النقد البنّاء والتنقيح
    // =======================================================================================
    report.push_str("\n---\n\n# المرحلة الثانية: النقد البنّاء والتنقيح\n\n");
    
    let all_agent_names = vec![
        "Story Architect", "Genre & Tone", "Character Development", "World Building",
        "Conflict & Tension", "Pacing", "Dialogue & Voice", "Theme", "Character Expansion",
        "Realism Critic", "Strategic Analyst", "Audience Persona", "Dramatic Context"
    ];
    let all_agents: Vec<_> = all_agent_names.iter().filter_map(|name| get_agent_instance_by_name(name)).collect();

    let mut refined_ideas = Vec::new();
    for mut idea in initial_ideas {
        report.push_str(&format!("## مراجعات لـ '{}':\n", idea.name));
        let mut review_futures = Vec::new();
        for agent in &all_agents {
            let prompt = format!("From your unique perspective as the {}, provide a detailed critical review (strengths and weaknesses) of the following story idea:\n\n---\n\n{}", agent.name(), idea.content);
            let agent_instance = get_agent_instance_by_name(agent.name()).unwrap();
            let llm_clone = Arc::clone(&llm);
            review_futures.push(async move { 
                agent_instance.execute(&prompt, &llm_clone).await 
            });
        }
        let reviews = join_all(review_futures).await;
        let mut combined_reviews = String::new();
        for (i, review_result) in reviews.into_iter().enumerate() {
            let review_text = review_result.unwrap_or_else(|e| format!("Error: {}", e));
            combined_reviews.push_str(&format!("- Review from {}: {}\n", all_agents[i].name(), review_text));
        }

        let refinement_prompt = format!(
            "You are the {} who created an idea. Based on the following expert reviews, provide a single, revised, and improved version of your original idea.\n\n**Original Idea:**\n{}\n\n**Expert Reviews:**\n{}",
            idea.creator_name, idea.content, combined_reviews
        );
        let refined_content = idea.creator_instance.execute(&refinement_prompt, &llm).await?;
        idea.content = refined_content;
        report.push_str(&format!("### النسخة المنقحة من '{}':\n{}\n\n", idea.name, idea.content));
        refined_ideas.push(idea);
    }

    // =======================================================================================
    // المرحلة الثالثة: النقاش المنهجي
    // =======================================================================================
    report.push_str("\n---\n\n# المرحلة الثالثة: النقاش المنهجي\n\n");

    let debate_rounds = vec![
        DebateRound { topic: "الهيكل السردي", agent_a_name: "Story Architect", agent_b_name: "Pacing" },
        DebateRound { topic: "عمق الشخصيات", agent_a_name: "Character Development", agent_b_name: "Realism Critic" },
    ];

    let mut debate_reports = Vec::new();
    for idea in &refined_ideas {
        let mut idea_debate_report = format!("## نتائج النقاش حول '{}':\n", idea.name);
        for round in &debate_rounds {
            let debate_prompt = format!(
                "DEBATE ROUND: {}\n\nIdea: {}\n\nAs the {} and {}, engage in a focused debate. {} starts. Present your arguments clearly.",
                round.topic, idea.content, round.agent_a_name, round.agent_b_name, round.agent_a_name
            );
            let debate_result = llm.generate(&debate_prompt, "models/gemini-1.5-pro-latest", &dotenv::var("ORCHESTRATOR_API_KEY").unwrap()).await?;
            idea_debate_report.push_str(&format!("### جولة: {}\n{}\n", round.topic, debate_result));

            // Devil's Advocate
            let devils_advocate_prompt = format!(
                "As a Devil's Advocate, your task is to attack the idea that seems to be winning the following debate. Identify its core weaknesses and challenge its logic mercilessly.\n\nDebate on {}:\n{}\n\nIdea:\n{}",
                round.topic, debate_result, idea.content
            );
            let devils_advocate_critique = llm.generate(&devils_advocate_prompt, "models/gemini-1.5-pro-latest", &dotenv::var("ORCHESTRATOR_API_KEY").unwrap()).await?;
            idea_debate_report.push_str(&format!("#### نقد محامي الشيطان:\n{}\n", devils_advocate_critique));
        }
        debate_reports.push(idea_debate_report);
    }
    report.push_str(&debate_reports.join("\n"));

    // =======================================================================================
    // المرحلة الرابعة: القرار النهائي وتعظيم القيمة
    // =======================================================================================
    report.push_str("\n---\n\n# المرحلة الرابعة: القرار النهائي وتعظيم القيمة\n\n");

    // صوت الجمهور
    let audience_persona_agent = AudiencePersonaAgent::new();
    let mut audience_reports = String::new();
    for idea in &refined_ideas {
        let audience_prompt = format!("As an 'Audience Persona' agent, review the following refined story idea from the perspective of a specific audience segment (e.g., 'teen fantasy reader' or 'hardboiled detective fan'). What is their likely reaction?\n\nIdea: {}", idea.content);
        let audience_feedback = audience_persona_agent.execute(&audience_prompt, &llm).await?;
        audience_reports.push_str(&format!("## رأي شخصية الجمهور عن '{}':\n{}\n\n", idea.name, audience_feedback));
    }
    report.push_str(&audience_reports);

    // الاختيار النهائي (عشوائي في هذا المثال، يمكن تطويره)
    let winning_idea = refined_ideas.choose(&mut rand::thread_rng()).unwrap();
    report.push_str(&format!("# الفكرة الفائزة: {}\n\n{}\n\n", winning_idea.name, winning_idea.content));

    // "إنقاذ" الكنوز المفقودة
    let character_expansion_agent = CharacterExpansionAgent::new();
    let mut saved_treasures_report = String::from("## الكنوز التي تم إنقاذها من الأفكار الأخرى:\n");
    for lost_idea in refined_ideas.iter().filter(|i| i.name != winning_idea.name) {
        let save_prompt = format!("Review the following losing idea and extract any unique characters, subplots, or concepts that could be salvaged and integrated into a different story.\n\nLosing Idea: {}", lost_idea.content);
        let saved_elements = character_expansion_agent.execute(&save_prompt, &llm).await?;
        saved_treasures_report.push_str(&format!("- من '{}': {}\n", lost_idea.name, saved_elements));
    }
    report.push_str(&saved_treasures_report);

    // "اختبار الإجهاد" النهائي
    let _conflict_agent = ConflictTensionAgent::new();
    let _realism_agent = RealismCriticAgent::new();
    let stress_test_prompt = format!("As the Conflict & Tension Agent and the Realism Critic, your job is to 'stress test' the following winning story. Ask the hardest questions about its logic, character motivations, and plot coherence. Try to 'break' the story.\n\nWinning Idea: {}", winning_idea.content);
    let stress_test_results = llm.generate(&stress_test_prompt, "models/gemini-1.5-pro-latest", &dotenv::var("ORCHESTRATOR_API_KEY").unwrap()).await?;
    report.push_str(&format!("\n## نتائج اختبار الإجهاد النهائي:\n{}\n", stress_test_results));

    Ok(report)
}
