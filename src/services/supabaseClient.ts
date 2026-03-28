import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createInterview(
  companyName: string,
  roleTitle: string,
  interviewerNames: string[]
) {
  const { data, error } = await supabase
    .from('interviews')
    .insert([
      {
        company_name: companyName,
        role_title: roleTitle,
        interviewer_names: interviewerNames,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function storeQuestion(
  interviewId: string,
  questionText: string,
  questionType: string,
  confidence: number
) {
  const { data, error } = await supabase
    .from('questions')
    .insert([
      {
        interview_id: interviewId,
        question_text: questionText,
        predicted_type: questionType,
        prediction_confidence: confidence,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function storeAnswer(
  interviewId: string,
  questionId: string,
  answerText: string,
  aiGeneratedAnswer: string,
  confidenceScore: number,
  suggestedTalkingPoints: string[]
) {
  const { data, error } = await supabase
    .from('answers')
    .insert([
      {
        interview_id: interviewId,
        question_id: questionId,
        answer_text: answerText,
        ai_generated_answer: aiGeneratedAnswer,
        confidence_score: confidenceScore,
        suggested_talking_points: suggestedTalkingPoints,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInterviewerProfile(
  interviewId: string,
  interviewerName: string,
  profileData: Record<string, any>
) {
  const { data: existing } = await supabase
    .from('interviewer_profiles')
    .select()
    .eq('interview_id', interviewId)
    .eq('interviewer_name', interviewerName)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('interviewer_profiles')
      .update(profileData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('interviewer_profiles')
      .insert([
        {
          interview_id: interviewId,
          interviewer_name: interviewerName,
          ...profileData,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function storeMemory(
  interviewId: string,
  topic: string,
  memoryType: 'short_term' | 'long_term',
  content: string,
  relevanceScore: number,
  associatedQuestions: string[]
) {
  const { data: existing } = await supabase
    .from('agent_memories')
    .select()
    .eq('interview_id', interviewId)
    .eq('topic', topic)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('agent_memories')
      .update({
        mention_count: existing.mention_count + 1,
        last_mentioned: new Date(),
        associated_questions: Array.from(
          new Set([...existing.associated_questions, ...associatedQuestions])
        ),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('agent_memories')
      .insert([
        {
          interview_id: interviewId,
          topic,
          memory_type: memoryType,
          content,
          relevance_score: relevanceScore,
          associated_questions: associatedQuestions,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function storeConversationTurn(
  interviewId: string,
  turnNumber: number,
  questionText: string,
  answerText: string,
  topics: string[],
  sentiment: 'positive' | 'neutral' | 'negative',
  engagementLevel: number
) {
  const { data, error } = await supabase
    .from('conversation_turns')
    .insert([
      {
        interview_id: interviewId,
        turn_number: turnNumber,
        question_text: questionText,
        answer_text: answerText,
        topics,
        sentiment,
        engagement_level: engagementLevel,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdaptiveStrategy(
  interviewId: string,
  strategyData: Record<string, any>
) {
  const { data: existing } = await supabase
    .from('adaptive_strategies')
    .select()
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('adaptive_strategies')
      .update(strategyData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('adaptive_strategies')
      .insert([
        {
          interview_id: interviewId,
          ...strategyData,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
