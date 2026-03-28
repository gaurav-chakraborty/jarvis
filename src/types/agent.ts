export type AgentState = 'listening' | 'thinking' | 'predicting' | 'executing' | 'idle';
export type InterviewPhase = 'opening' | 'technical' | 'behavioral' | 'closing';
export type QuestionType = 'technical' | 'behavioral' | 'experience' | 'motivation' | 'unknown';
export type InterviewerMood = 'engaged' | 'neutral' | 'confused' | 'skeptical';
export type InterviewerStyle = 'technical' | 'behavioral' | 'balanced';
export type InterviewerPace = 'fast' | 'moderate' | 'slow';
export type StrategyType = 'build_rapport' | 'show_depth' | 'simplify_clarify' | 'use_star' | 'ask_smart_questions';

export interface PredictedIntent {
  type: QuestionType;
  question: string;
  confidence: number;
  suggestedResponse?: string;
  topics: string[];
}

export interface ConversationTurn {
  question: string;
  answer: string;
  feedback?: string;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  engagementLevel: number;
}

export interface InterviewerProfile {
  name: string;
  preferredStyle: InterviewerStyle;
  pace: InterviewerPace;
  followUpTendency: number;
  technicalDepthPreference: number;
  engagementLevel: number;
  knownPreferences: string[];
  questionCount: number;
}

export interface InterviewContext {
  companyName: string;
  roleTitle: string;
  interviewerNames: string[];
  currentPhase: InterviewPhase;
  totalQuestionsAsked: number;
}

export interface ConversationAnalysis {
  text: string;
  intent: PredictedIntent;
  strategy: Strategy;
  confidence: number;
  suggestedState: AgentState;
  conversationPace: number;
}

export interface Strategy {
  type: StrategyType;
  tacticalAdjustments: string[];
  talkingPoints: string[];
  confidenceThreshold: number;
}

export interface AgentAction {
  type: 'prepare_answer' | 'customize_for_interviewer' | 'load_company_context' | 'suggest_talking_points' | 'auto_copy_answer' | 'adjust_tone' | 'highlight_experience' | 'suggest_question';
  priority: 'high' | 'medium' | 'low';
  data?: Record<string, any>;
}

export interface ExecutedAction {
  action: AgentAction;
  timestamp: Date;
  success: boolean;
  result?: string;
}

export interface TopicMemory {
  topic: string;
  firstMentioned: Date;
  lastMentioned: Date;
  mentions: number;
  associatedQuestions: string[];
  relevanceScore: number;
}

export interface SuggestionCard {
  id: string;
  title: string;
  content: string;
  type: 'talking_point' | 'question' | 'context' | 'correction';
  priority: 'high' | 'medium' | 'low';
}
