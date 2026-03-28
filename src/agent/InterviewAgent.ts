import { IntentPredictorAgent } from './IntentPredictorAgent';
import { StrategistAgent } from './StrategistAgent';
import { MemoryAgent } from './MemoryAgent';
import {
  AgentState,
  PredictedIntent,
  InterviewContext,
  Strategy,
  AgentAction,
  ConversationTurn,
  InterviewerProfile,
} from '../types/agent';

export class InterviewAgent {
  private state: AgentState = 'idle';
  private predictorAgent: IntentPredictorAgent;
  private strategistAgent: StrategistAgent;
  private memoryAgent: MemoryAgent;
  private currentContext: InterviewContext;
  private interviewerProfiles: Map<string, InterviewerProfile> = new Map();
  private predictedIntent: PredictedIntent | null = null;
  private suggestedActions: AgentAction[] = [];
  private confidence: number = 0;

  constructor(context: InterviewContext) {
    this.currentContext = context;
    this.predictorAgent = new IntentPredictorAgent();
    this.strategistAgent = new StrategistAgent();
    this.memoryAgent = new MemoryAgent();

    // Initialize interviewer profiles
    for (const name of context.interviewerNames) {
      this.interviewerProfiles.set(name, {
        name,
        preferredStyle: 'balanced',
        pace: 'moderate',
        followUpTendency: 0.5,
        technicalDepthPreference: 0.5,
        engagementLevel: 0.5,
        knownPreferences: [],
        questionCount: 0,
      });
    }
  }

  analyzeInput(text: string): {
    predictedIntent: PredictedIntent;
    suggestedActions: AgentAction[];
    confidence: number;
  } {
    this.state = 'thinking';

    // Predict intent
    this.predictedIntent = this.predictorAgent.predictIntent(text);
    this.confidence = this.predictedIntent.confidence;

    // Get current strategy
    const strategy = this.strategistAgent.getCurrentStrategy();

    // Decide on actions
    this.suggestedActions = this.decideActions(
      text,
      this.predictedIntent,
      strategy
    );

    this.state = this.confidence > 0.75 ? 'predicting' : 'listening';

    return {
      predictedIntent: this.predictedIntent,
      suggestedActions: this.suggestedActions,
      confidence: this.confidence,
    };
  }

  private decideActions(
    text: string,
    intent: PredictedIntent,
    strategy: Strategy
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    // Rule 1: If question detected with high confidence, prepare answer
    if (intent.type !== 'unknown' && this.confidence > 0.7) {
      actions.push({
        type: 'prepare_answer',
        priority: 'high',
        data: { question: text, intentType: intent.type },
      });
    }

    // Rule 2: If confidence very high, suggest talking points
    if (this.confidence > 0.85) {
      actions.push({
        type: 'suggest_talking_points',
        priority: 'high',
        data: { points: strategy.talkingPoints },
      });
    }

    // Rule 3: If tactical adjustments needed
    if (strategy.tacticalAdjustments.length > 0) {
      actions.push({
        type: 'adjust_tone',
        priority: 'medium',
        data: { adjustments: strategy.tacticalAdjustments },
      });
    }

    // Rule 4: Auto-copy answer if extremely high confidence
    if (this.confidence > 0.95) {
      actions.push({
        type: 'auto_copy_answer',
        priority: 'medium',
      });
    }

    return actions;
  }

  storeConversationTurn(
    question: string,
    answer: string,
    topics: string[],
    sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  ): void {
    const turn: ConversationTurn = {
      question,
      answer,
      topics,
      sentiment,
      engagementLevel: 0.5,
    };

    this.memoryAgent.store(turn);
    this.currentContext.totalQuestionsAsked += 1;
  }

  predictNextQuestion(): string | null {
    return this.memoryAgent.predictNextQuestion();
  }

  updateInterviewerMood(
    interviewerName: string,
    feedback: string
  ): void {
    const mood = this.strategistAgent.analyzeSentiment(feedback);
    this.strategistAgent.setMood(mood);

    // Update interviewer profile
    if (this.interviewerProfiles.has(interviewerName)) {
      const profile = this.interviewerProfiles.get(interviewerName)!;
      profile.engagementLevel =
        mood === 'engaged'
          ? Math.min(1, profile.engagementLevel + 0.1)
          : mood === 'confused'
            ? Math.max(0, profile.engagementLevel - 0.1)
            : profile.engagementLevel;
    }
  }

  getMemorySummary(): {
    recentTurns: ConversationTurn[];
    topTopics: string[];
  } {
    const recentTurns = this.memoryAgent.getShortTermMemory().slice(-5);
    const topTopics = this.memoryAgent
      .getLongTermMemory()
      .slice(0, 3)
      .map(m => m.topic);

    return { recentTurns, topTopics };
  }

  getInterviewerProfiles(): Record<string, InterviewerProfile> {
    const profiles: Record<string, InterviewerProfile> = {};
    for (const [name, profile] of this.interviewerProfiles) {
      profiles[name] = profile;
    }
    return profiles;
  }

  getState(): AgentState {
    return this.state;
  }

  getConfidence(): number {
    return this.confidence;
  }

  getPredictedIntent(): PredictedIntent | null {
    return this.predictedIntent;
  }

  getCurrentStrategy(): Strategy {
    return this.strategistAgent.getCurrentStrategy();
  }
}
