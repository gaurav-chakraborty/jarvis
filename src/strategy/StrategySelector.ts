import { IConfig, ILogger, Intent, Strategy, MemoryItem } from '../types/index';
import { ConversationContext } from '../analysis/ConversationAnalyzer';

export class StrategySelector {
  private currentContext: ConversationContext | null = null;

  constructor(private config: IConfig, private logger: ILogger) {
    void this.config;
    void this.logger;
  }

  async select(intent: Intent, context: unknown, memories: MemoryItem[]): Promise<Strategy> {
    this.currentContext = context as ConversationContext;
    void memories;

    switch (intent.type) {
      case 'technical':
        return {
          name: 'technical-depth',
          description: 'Demonstrate technical expertise with specifics, metrics, and trade-offs',
          confidence: 0.9,
        };

      case 'behavioral':
        return {
          name: 'star-method',
          description: 'Use Situation-Task-Action-Result format with a compelling story',
          confidence: 0.88,
        };

      case 'experience':
        return {
          name: 'highlight-experience',
          description: 'Highlight relevant past experience with quantified impact',
          confidence: 0.85,
        };

      case 'motivation':
        return {
          name: 'passion-alignment',
          description: "Align personal goals with company's mission and role",
          confidence: 0.82,
        };

      case 'closing':
        return {
          name: 'smart-questions',
          description: 'Ask insightful questions that show genuine interest and preparation',
          confidence: 0.8,
        };

      case 'company':
        return {
          name: 'company-knowledge',
          description: 'Demonstrate research about company culture, products, and direction',
          confidence: 0.78,
        };

      default:
        return {
          name: 'conversational',
          description: 'Maintain natural, confident conversation flow',
          confidence: 0.7,
        };
    }
  }

  updateContext(context: unknown): void {
    this.currentContext = context as ConversationContext;
  }

  getCurrentContext(): ConversationContext | null {
    return this.currentContext;
  }
}
