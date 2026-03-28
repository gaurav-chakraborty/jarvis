export type AgentState = 'idle' | 'listening' | 'processing' | 'error' | 'shutdown';

export type IntentType =
  | 'technical'
  | 'experience'
  | 'behavioral'
  | 'motivation'
  | 'company'
  | 'closing'
  | 'general'
  | 'context';

export interface Intent {
  type: IntentType;
  score: number;
  topics: string[];
  questionFormat: 'open-ended' | 'yes-no' | 'multiple-choice';
  urgency: number;
  originalText: string;
  timestamp: Date;
}

export interface Transcript {
  text: string;
  confidence: number;
  timestamp: Date;
}

export interface Strategy {
  name: string;
  description: string;
  confidence: number;
}

export interface LLMResponse {
  text: string;
  confidence: number;
  strategy: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface LLMRequest {
  question: string;
  intent: Intent;
  strategy: Strategy;
  context?: unknown;
  memories?: MemoryItem[];
  knowledgeGraph?: string[];
}

export interface Decision {
  shouldAct: boolean;
  action: string;
  response: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface MemoryItem {
  content: string;
  type: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationTurn {
  transcript: Transcript;
  response: LLMResponse;
  intent: Intent;
  strategy: Strategy;
  decision: Decision;
  timestamp: Date;
}

export interface IConfig {
  geminiApiKey: string;
  openAiApiKey?: string;
  autonomyLevel: number;
  confidenceThreshold: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  dataPath: string;
  userContext: {
    resume: string;
    jobDescription: string;
    role: string;
    company: string;
    interviewers: string[];
  };
}

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type AgentEventType =
  | 'ready'
  | 'processing'
  | 'intent-detected'
  | 'memory-recalled'
  | 'strategy-selected'
  | 'decision-made'
  | 'action-executed'
  | 'error'
  | 'shutdown';
