import { IConfig, ILogger, Intent, IntentType } from '../types/index';

export class IntentClassifier {
  private patterns: Map<IntentType, RegExp[]> = new Map();
  private confidenceThreshold: number = 0.6;

  constructor(private config: IConfig, private logger: ILogger) {
    // Suppress unused variable warnings
    void this.config;
    void this.logger;
    this.loadPatterns();
  }

  private loadPatterns(): void {
    this.patterns.set('technical', [
      /how (do|would|can) you/i,
      /what (is|are) your experience with/i,
      /explain (how|why|what)/i,
      /technical/i,
      /algorithm/i,
      /architecture/i,
      /system design/i,
      /code/i,
      /implementation/i,
    ]);

    this.patterns.set('experience', [
      /tell me about your experience/i,
      /have you worked with/i,
      /previous role/i,
      /past project/i,
      /background in/i,
      /years of experience/i,
    ]);

    this.patterns.set('behavioral', [
      /tell me about a time/i,
      /describe a situation/i,
      /how (did|would) you handle/i,
      /challenge/i,
      /conflict/i,
      /teamwork/i,
      /leadership/i,
    ]);

    this.patterns.set('motivation', [
      /why (do you want|are you interested)/i,
      /what (attracts|interests) you/i,
      /why this (company|role|position)/i,
      /career goals/i,
      /passionate about/i,
    ]);

    this.patterns.set('company', [
      /why (us|our company|microsoft|google)/i,
      /what do you know about (us|our)/i,
      /our (product|culture|mission)/i,
    ]);

    this.patterns.set('closing', [
      /do you have any questions/i,
      /any questions for (us|me)/i,
      /what questions do you have/i,
    ]);
  }

  async classify(text: string, context: unknown): Promise<Intent> {
    void context;
    const scores = new Map<IntentType, number>();

    for (const [type, patterns] of this.patterns.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          score += 0.2;
        }
      }
      scores.set(type, Math.min(score, 1.0));
    }

    let primaryType: IntentType = 'general';
    let highestScore = 0;

    for (const [type, score] of scores.entries()) {
      if (score > highestScore) {
        highestScore = score;
        primaryType = type;
      }
    }

    if (highestScore < this.confidenceThreshold) {
      primaryType = 'general';
      highestScore = 0.5;
    }

    const topics = this.extractTopics(text);
    const questionFormat = this.detectQuestionFormat(text);
    const urgency = this.calculateUrgency(text);

    return {
      type: primaryType,
      score: highestScore,
      topics,
      questionFormat,
      urgency,
      originalText: text,
      timestamp: new Date(),
    };
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'python', 'javascript', 'typescript', 'react', 'node', 'database',
      'sql', 'nosql', 'api', 'rest', 'graphql', 'cloud', 'aws', 'azure',
      'machine learning', 'ai', 'analytics', 'data pipeline', 'etl',
      'performance', 'optimization', 'scalability', 'security',
    ];

    const lowerText = text.toLowerCase();
    for (const keyword of topicKeywords) {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    }

    return topics;
  }

  private detectQuestionFormat(text: string): 'open-ended' | 'yes-no' | 'multiple-choice' {
    if (/^(is|are|do|does|did|can|could|will|would|should)/i.test(text)) {
      return 'yes-no';
    }
    if (text.includes(' or ')) {
      return 'multiple-choice';
    }
    return 'open-ended';
  }

  private calculateUrgency(text: string): number {
    const urgentKeywords = ['quick', 'fast', 'immediately', 'right now', 'urgent'];
    let urgency = 0.5;

    for (const keyword of urgentKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        urgency += 0.1;
      }
    }

    return Math.min(urgency, 1.0);
  }
}
