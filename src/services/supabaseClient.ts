import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '../utils/requestHandler';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function withDbTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return withTimeout(promise, timeoutMs);
}

export async function createInterview(
  companyName: string,
  roleTitle: string,
  interviewerNames: string[]
) {
  const { data, error } = await withDbTimeout(
    supabase
      .from('interviews')
      .insert([
        {
          company_name: companyName,
          role_title: roleTitle,
          interviewer_names: interviewerNames,
        },
      ])
      .select()
      .single()
  );

  if (error) throw error;
  return data;
}

export async function storeQuestion(
  interviewId: string,
  questionText: string,
  questionType: string,
  confidence: number
) {
  const { data, error } = await withDbTimeout(
    supabase
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
      .single()
  );

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
  const { data, error } = await supabase
    .from('interviewer_profiles')
    .upsert(
      {
        interview_id: interviewId,
        interviewer_name: interviewerName,
        ...profileData,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'interview_id,interviewer_name' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function storeMemory(
  interviewId: string,
  topic: string,
  memoryType: 'short_term' | 'long_term',
  content: string,
  relevanceScore: number,
  associatedQuestions: string[]
) {
  const { data, error } = await supabase
    .from('agent_memories')
    .upsert(
      {
        interview_id: interviewId,
        topic,
        memory_type: memoryType,
        content,
        relevance_score: relevanceScore,
        associated_questions: associatedQuestions,
        mention_count: 1,
        last_mentioned: new Date().toISOString(),
      },
      { onConflict: 'interview_id,topic' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('adaptive_strategies')
    .upsert(
      {
        interview_id: interviewId,
        ...strategyData,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'interview_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
