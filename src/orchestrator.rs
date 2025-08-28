#![allow(dead_code)]
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
use futures::future::join_all;

// To represent different agent types in a structured way
#[derive(Debug, PartialEq, Eq, Hash, Clone, Copy)]
enum AgentType {
   StoryArchitect,
   GenreTone,
   CharacterDevelopment,
   WorldBuilding,
   ConflictTension,
   Pacing,
   DialogueVoice,
   Theme,
   CharacterExpansion,
   RealismCritic,
   StrategicAnalyst,
   AudiencePersona,
}

// Helper function to get agent instance from type
fn get_agent(agent_type: AgentType) -> Box<dyn Agent + Send + Sync> {
   match agent_type {
       AgentType::StoryArchitect => Box::new(StoryArchitectAgent::new()),
       AgentType::GenreTone => Box::new(GenreToneAgent::new()),
       AgentType::CharacterDevelopment => Box::new(CharacterDevelopmentAgent::new()),
       AgentType::WorldBuilding => Box::new(WorldBuildingAgent::new()),
       AgentType::ConflictTension => Box::new(ConflictTensionAgent::new()),
       AgentType::Pacing => Box::new(PacingAgent::new()),
       AgentType::DialogueVoice => Box::new(DialogueVoiceAgent::new()),
       AgentType::Theme => Box::new(ThemeAgent::new()),
       AgentType::CharacterExpansion => Box::new(CharacterExpansionAgent::new()),
       AgentType::RealismCritic => Box::new(RealismCriticAgent::new()),
       AgentType::StrategicAnalyst => Box::new(StrategicAnalystAgent::new()),
       AgentType::AudiencePersona => Box::new(AudiencePersonaAgent::new()),
   }
}

struct DebateRound {
   topic: String,
   agent_a: AgentType,
   agent_b: AgentType,
}

struct Idea {
   name: String,
    content: String,
    creator: Box<dyn Agent + Send + Sync>,
}

pub async fn run_ideation_session(prompt: &str) -> Result<String, AgentError> {
    dotenv::dotenv().ok();
    let llm = LanguageModel::new();
    let mut report = String::new();

    // =======================================================================================
    // المرحلة الأولى: شرارة الإبداع والاختيار الأولي
    // =======================================================================================
    report.push_str("# المرحلة الأولى: شرارة الإبداع والاختيار الأولي\n\n");

    let spark_agents: Vec<Box<dyn Agent + Send + Sync>> = vec![
        Box::new(WorldBuildingAgent::new()),
        Box::new(GenreToneAgent::new()),
        Box::new(ConflictTensionAgent::new()),
        Box::new(CharacterDevelopmentAgent::new()),
        Box::new(ThemeAgent::new()),
    ];

    let spark_prompts: Vec<String> = spark_agents.iter().map(|_agent| {
        format!("Based on the user's brief '{}', generate a single, compelling logline or core concept from your unique perspective.", prompt)
    }).collect();

    let mut spark_futures = Vec::new();
    for (i, agent) in spark_agents.iter().enumerate() {
        spark_futures.push(agent.execute(&spark_prompts[i], &llm));
    }
    let sparks = join_all(spark_futures).await;

    report.push_str("## الشرارات الإبداعية الأولية:\n\n");
    let error_spark = "Error generating spark".to_string();
    for (i, spark) in sparks.iter().enumerate() {
        let agent_name = spark_agents[i].name();
        let spark_text = spark.as_ref().unwrap_or(&error_spark);
        report.push_str(&format!("**من {}:** {}\n\n", agent_name, spark_text));
    }

    // محاكاة اختيار المستخدم وإنشاء الفكرة الهجينة
    let strategic_analyst = StrategicAnalystAgent::new();
    let hybrid_prompt = format!("You are a master storyteller. Combine the best and most complementary elements from the following two distinct ideas to create a third, superior hybrid concept. Do not just list features; synthesize them into a new, cohesive logline.\n\n**Idea 1:** {}\n\n**Idea 2:** {}", sparks[0].as_ref().unwrap(), sparks[1].as_ref().unwrap());
    let hybrid_idea_content = strategic_analyst.execute(&hybrid_prompt, &llm).await?;

    let mut ideas_for_review = vec![
        Idea { name: "الفكرة الأولى (الأصلية)".to_string(), content: sparks[0].as_ref().unwrap().clone(), creator: Box::new(WorldBuildingAgent::new()) },
        Idea { name: "الفكرة الثانية (الأصلية)".to_string(), content: sparks[1].as_ref().unwrap().clone(), creator: Box::new(GenreToneAgent::new()) },
        Idea { name: "الفكرة الثالثة (الهجينة)".to_string(), content: hybrid_idea_content, creator: Box::new(StrategicAnalystAgent::new()) },
    ];

    report.push_str("## الأفكار الثلاثة المتنافسة:\n\n");
    for idea in &ideas_for_review {
        report.push_str(&format!("### {}\n{}\n\n", idea.name, idea.content));
    }

    // =======================================================================================
    // المرحلة الثانية: النقد البنّاء والتنقيح
    // =======================================================================================
    report.push_str("\n---\n\n# المرحلة الثانية: النقد البنّاء والتنقيح\n\n");

    let all_agents: Vec<Box<dyn Agent + Send + Sync>> = vec![
        Box::new(StoryArchitectAgent::new()), Box::new(GenreToneAgent::new()),
        Box::new(CharacterDevelopmentAgent::new()), Box::new(WorldBuildingAgent::new()),
        Box::new(ConflictTensionAgent::new()), Box::new(PacingAgent::new()),
        Box::new(DialogueVoiceAgent::new()), Box::new(ThemeAgent::new()),
        Box::new(CharacterExpansionAgent::new()), Box::new(RealismCriticAgent::new()),
        Box::new(StrategicAnalystAgent::new()), Box::new(AudiencePersonaAgent::new()),
    ];

    let mut refined_ideas = Vec::new();

    for idea in &mut ideas_for_review {
        report.push_str(&format!("## مراجعات لـ {}:\n\n", idea.name));

        let review_prompts: Vec<String> = all_agents.iter().map(|agent| {
            format!("From your unique perspective as the {}, provide a detailed critical review (strengths and weaknesses) of the following story idea:\n\n---\n\n{}", agent.name(), idea.content)
        }).collect();

        let mut review_futures = Vec::new();
        for (i, agent) in all_agents.iter().enumerate() {
            review_futures.push(agent.execute(&review_prompts[i], &llm));
        }
        let reviews = join_all(review_futures).await;

        let mut combined_reviews = String::new();
        let error_review = "Error generating review.".to_string();
        for (i, review_result) in reviews.iter().enumerate() {
            let agent_name = all_agents[i].name();
            let review_text = review_result.as_ref().unwrap_or(&error_review);
            report.push_str(&format!("**مراجعة من {}:** {}\n\n", agent_name, review_text));
            combined_reviews.push_str(&format!("- Review from {}: {}\n", agent_name, review_text));
        }

        // خطوة التنقيح - يتم استدعاء المنشئ الأصلي
        let refinement_prompt = format!(
            "You are the creator of a story idea ({}), and you are a {}. Based on the following expert reviews, provide a single, revised, and improved version of your original idea. Your refined idea should be a complete concept, not a commentary on the reviews.\n\n**Original Idea:**\n{}\n\n**Expert Reviews:**\n{}",
            idea.name, idea.creator.name(), idea.content, combined_reviews
        );
        let refined_idea_content = idea.creator.execute(&refinement_prompt, &llm).await?;
        
        let refined_idea_name = idea.name.replace("(الأصلية)", "(المنقحة)").replace("(الهجينة)", "(المنقحة)");
        report.push_str(&format!("### النسخة المنقحة من {}:\n{}\n\n", idea.name, refined_idea_content));
        refined_ideas.push((refined_idea_name, refined_idea_content));
    }

   // =======================================================================================
   // المرحلة الثالثة: النقاش المنهجي
   // =======================================================================================
   report.push_str("\n---\n\n# المرحلة الثالثة: النقاش المنهجي\n\n");

   let debate_rounds = vec![
       DebateRound {
           topic: "الهيكل السردي وقوة الحبكة".to_string(),
           agent_a: AgentType::StoryArchitect,
           agent_b: AgentType::ConflictTension,
       },
       DebateRound {
           topic: "عمق الشخصيات وتطورها".to_string(),
           agent_a: AgentType::CharacterDevelopment,
           agent_b: AgentType::DialogueVoice,
       },
       DebateRound {
           topic: "أصالة العالم وجاذبية الأجواء".to_string(),
           agent_a: AgentType::WorldBuilding,
           agent_b: AgentType::GenreTone,
       },
       DebateRound {
           topic: "عمق الموضوع وتكامله مع البناء السردي".to_string(),
           agent_a: AgentType::Theme,
           agent_b: AgentType::StoryArchitect,
       },
       DebateRound {
           topic: "إيقاع القصة وتأثيره على تجربة الجمهور".to_string(),
           agent_a: AgentType::Pacing,
           agent_b: AgentType::AudiencePersona,
       },
   ];

   let mut final_idea_evaluations = Vec::new();

   for (idea_name, idea_content) in &refined_ideas {
       report.push_str(&format!("## جولات النقاش لـ {}:\n\n", idea_name));
       let mut round_conclusions = String::new();

       for round in &debate_rounds {
           report.push_str(&format!("### جولة: {}\n", round.topic));

           let agent_a = get_agent(round.agent_a);
           let agent_b = get_agent(round.agent_b);

           let debate_prompt_a = format!("As the {}, analyze the following story idea, focusing specifically on '{}'. What are its greatest strengths and weaknesses in this specific area?\n\nIdea: {}", agent_a.name(), round.topic, idea_content);
           let debate_prompt_b = format!("As the {}, analyze the following story idea, focusing specifically on '{}'. What are its greatest strengths and weaknesses in this specific area?\n\nIdea: {}", agent_b.name(), round.topic, idea_content);

           let (analysis_a_result, analysis_b_result) = tokio::join!(
               agent_a.execute(&debate_prompt_a, &llm),
               agent_b.execute(&debate_prompt_b, &llm)
           );

           let analysis_a = analysis_a_result?;
           let analysis_b = analysis_b_result?;

           report.push_str(&format!("**وجهة نظر {}:** {}\n\n", agent_a.name(), analysis_a));
           report.push_str(&format!("**وجهة نظر {}:** {}\n\n", agent_b.name(), analysis_b));

           let comparison_prompt = format!("You are a master story analyst. Based on the two competing analyses below regarding '{}', which agent provided a more insightful and compelling critique? Briefly explain your reasoning and declare a 'winner' for this round.\n\n**Analysis from {}:**\n{}\n\n**Analysis from {}:**\n{}", round.topic, agent_a.name(), analysis_a, agent_b.name(), analysis_b);
           let strategic_analyst = get_agent(AgentType::StrategicAnalyst);
           let comparison = strategic_analyst.execute(&comparison_prompt, &llm).await?;

           report.push_str(&format!("**تحليل مقارن:** {}\n\n", comparison));
           round_conclusions.push_str(&format!("- Round '{}': {}\n", round.topic, comparison));
       }

       // مرحلة محامي الشيطان
       report.push_str(&format!("### محامي الشيطان لـ {}:\n\n", idea_name));
       let devils_advocate = get_agent(AgentType::RealismCritic); // Realism Critic is a good choice
       let advocate_prompt = format!("You are the Devil's Advocate. Your sole purpose is to find every potential flaw, weakness, plot hole, and inconsistency in the following story idea. Be ruthless and thorough. Do not offer praise or solutions.\n\n**Idea to critique:**\n{}", idea_content);
       let critique = devils_advocate.execute(&advocate_prompt, &llm).await?;
       report.push_str(&format!("**نقد محامي الشيطان ({})**: {}\n\n", devils_advocate.name(), critique));

       final_idea_evaluations.push(format!(
           "Idea: {}\n- Round Summaries:\n{}\n- Devil's Advocate Critique: {}\n",
           idea_name, round_conclusions, critique
       ));
   }

   // =======================================================================================
   // المرحلة الرابعة: القرار النهائي وتعظيم القيمة
   // =======================================================================================
   report.push_str("\n---\n\n# المرحلة الرابعة: القرار النهائي وتعظيم القيمة\n\n");

   // 1. إضافة "صوت الجمهور" النهائي
   report.push_str("## 1. صوت الجمهور النهائي\n\n");
   let audience_persona_agent = get_agent(AgentType::AudiencePersona);
   let audience_prompt = format!("As the Audience Persona, representing a specific market segment (e.g., 'teenagers who love sci-fi' or 'adults looking for a complex drama'), provide your final opinion on which of these story concepts you would be most excited to watch, read, or play. Your opinion should add a commercial and market-driven perspective.\n\n---\n\n{}", final_idea_evaluations.join("\n---\n"));
   let audience_feedback = audience_persona_agent.execute(&audience_prompt, &llm).await?;
   report.push_str(&format!("**رأي الجمهور ({})**: {}\n\n", audience_persona_agent.name(), audience_feedback));

   // الاختيار النهائي
   let final_decision_prompt = format!("As the Strategic Analyst, you have overseen a rigorous multi-stage evaluation of three story concepts. Review the debate summaries, the Devil's Advocate critiques, and the final Audience Persona feedback. Based on all this information, which single idea shows the most promise to become a successful and compelling story? Announce your final choice clearly by starting your response with 'The winning idea is: [Idea Name]' and then provide a concise, high-level justification for your decision.\n\n**Debate & Critique Summaries:**\n{}\n\n**Audience Feedback:**\n{}", final_idea_evaluations.join("\n---\n"), audience_feedback);
   let final_analyst = get_agent(AgentType::StrategicAnalyst);
   let final_decision_text = final_analyst.execute(&final_decision_prompt, &llm).await?;
   report.push_str(&format!("## 2. القرار الاستراتيجي النهائي:\n\n{}\n\n", final_decision_text));

   // استخراج الفكرة الفائزة وتحديد الأفكار الخاسرة
   let mut winning_idea: Option<(String, String)> = None;
   let mut losing_ideas_content = Vec::new();
   
   // البحث عن اسم الفكرة الفائزة في النص
   let winner_declaration_prefix = "The winning idea is: ";
   if let Some(start_index) = final_decision_text.find(winner_declaration_prefix) {
       let name_start = start_index + winner_declaration_prefix.len();
       if let Some(name_end) = final_decision_text[name_start..].find('\n') {
           let winner_name = &final_decision_text[name_start..name_start + name_end].trim();
           for (name, content) in &refined_ideas {
               if name.contains(winner_name) { // استخدام contains لمرونة أكبر
                   winning_idea = Some((name.clone(), content.clone()));
               }
           }
       }
   }
   
   // إذا لم يتم العثور على الفائز، افترض الأول كفائز للمتابعة
   if winning_idea.is_none() {
       winning_idea = refined_ideas.get(0).cloned();
   }

   let (winner_name, mut winner_content) = winning_idea.unwrap_or_else(|| ("Unknown".to_string(), "Content not found".to_string()));

   for (name, content) in &refined_ideas {
       if *name != winner_name {
           losing_ideas_content.push(format!("**Idea: {}**\n{}", name, content));
       }
   }

   // 2. تنفيذ "إنقاذ الكنوز المفقودة"
   if !losing_ideas_content.is_empty() {
       report.push_str("## 3. إنقاذ الكنوز المفقودة\n\n");
       let character_expansion_agent = get_agent(AgentType::CharacterExpansion);
       let salvage_prompt = format!("You are the Character Expansion agent. Your specific task is to salvage value from rejected ideas. Review the following losing concepts and extract any distinct characters, subplots, or unique concepts that can be saved and integrated into the winning idea to make it richer. Then, provide a revised version of the winning idea that incorporates these salvaged elements.\n\n**Winning Idea to Enhance:**\n{}\n\n**Losing Ideas to Salvage From:**\n\n{}", winner_content, losing_ideas_content.join("\n\n---\n\n"));
       let enriched_idea = character_expansion_agent.execute(&salvage_prompt, &llm).await?;
       report.push_str(&format!("**الفكرة الفائزة بعد إثرائها بالعناصر المنقذة:**\n{}\n\n", enriched_idea));
       winner_content = enriched_idea; // تحديث محتوى الفكرة الفائزة
   }

   // 3. تنفيذ "اختبار الإجهاد النهائي"
   report.push_str("## 4. اختبار الإجهاد النهائي\n\n");
   let conflict_agent = get_agent(AgentType::ConflictTension);
   let realism_agent = get_agent(AgentType::RealismCritic);
   let stress_test_prompt = format!("This is a final stress test. Your mission is to try and break this story by asking tough questions about its logic, character motivations, and dramatic coherence. Be critical and identify potential weaknesses.\n\n**Story to Stress Test:**\n{}", winner_content);
   
   let (conflict_issues_result, realism_issues_result) = tokio::join!(
       conflict_agent.execute(&stress_test_prompt, &llm),
       realism_agent.execute(&stress_test_prompt, &llm)
   );

   let conflict_issues = conflict_issues_result?;
   let realism_issues = realism_issues_result?;

   report.push_str(&format!("**تحليل {}:**\n{}\n\n", conflict_agent.name(), conflict_issues));
   report.push_str(&format!("**تحليل {}:**\n{}\n\n", realism_agent.name(), realism_issues));


   Ok(report)
}
