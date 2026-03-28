import { ILogger, ConversationTurn } from '../types/index';

export interface ConversationContext {
  phase: 'opening' | 'technical' | 'behavioral' | 'closing' | 'unknown';
  sentiment: 'positive' | 'neutral' | 'negative';
  pace: 'fast' | 'moderate' | 'slow';
  topicsDiscussed: string[];
  questionCount: number;
  lastQuestionType: string;
}

export class ConversationAnalyzer {
  private questionCount: number = 0;
  private topicsDiscussed: Set<string> = new Set();

  constructor(private logger: ILogger) {
    void this.logger;
  }

  async analyze(text: string, recentTurns: ConversationTurn[]): Promise<ConversationContext> {
    this.questionCount++;

    const phase = this.detectPhase(text, recentTurns);
    const sentiment = this.detectSentiment(text);
    const pace = this.detectPace(recentTurns);
    const topics = this.extractTopics(text);

    for (const topic of topics) {
      this.topicsDiscussed.add(topic);
    }

    return {
      phase,
      sentiment,
      pace,
      topicsDiscussed: Array.from(this.topicsDiscussed),
      questionCount: this.questionCount,
      lastQuestionType: phase,
    };
  }

  private detectPhase(text: string, recentTurns: ConversationTurn[]): ConversationContext['phase'] {
    const lower = text.toLowerCase();

    if (/do you have any questions|any questions for (us|me)/i.test(lower)) return 'closing';
    if (/tell me about yourself|walk me through your background/i.test(lower)) return 'opening';
    if (/algorithm|system design|code|technical|architecture/i.test(lower)) return 'technical';
    if (/tell me about a time|describe a situation|how did you handle/i.test(lower)) return 'behavioral';

    // Infer from history
    if (recentTurns.length > 0) {
      const lastIntent = recentTurns[recentTurns.length - 1]?.intent?.type;
      if (lastIntent === 'technical') return 'technical';
      if (lastIntent === 'behavioral') return 'behavioral';
    }

    return 'unknown';
  }

  private detectSentiment(text: string): ConversationContext['sentiment'] {
    const positive = /great|excellent|perfect|good|interesting|love|fantastic/i;
    const negative = /concern|worry|unclear|confused|problem|issue/i;

    if (positive.test(text)) return 'positive';
    if (negative.test(text)) return 'negative';
    return 'neutral';
  }

  private detectPace(recentTurns: ConversationTurn[]): ConversationContext['pace'] {
    if (recentTurns.length < 2) return 'moderate';

    const last = recentTurns[recentTurns.length - 1];
    const prev = recentTurns[recentTurns.length - 2];

    if (!last || !prev) return 'moderate';

    const gap = last.timestamp.getTime() - prev.timestamp.getTime();
    if (gap < 30_000) return 'fast';
    if (gap > 120_000) return 'slow';
    return 'moderate';
  }

  private extractTopics(text: string): string[] {
    const topicMap: Record<string, RegExp> = {
      'system-design': /system design|architecture|scalability/i,
      'data-structures': /array|linked list|tree|graph|hash/i,
      'leadership': /team|led|managed|mentored/i,
      'problem-solving': /challenge|problem|solution|approach/i,
      'cloud': /aws|azure|gcp|cloud/i,
      'ml': /machine learning|model|prediction|data science/i,
    };

    return Object.entries(topicMap)
      .filter(([, pattern]) => pattern.test(text))
      .map(([topic]) => topic);
  }
}
