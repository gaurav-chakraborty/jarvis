import { ConversationTurn, TopicMemory } from '../types/agent';

export class MemoryAgent {
  private shortTermMemory: ConversationTurn[] = [];
  private longTermMemory: Map<string, TopicMemory> = new Map();
  private maxShortTermSize = 20;

  store(turn: ConversationTurn): void {
    this.shortTermMemory.push(turn);

    // Consolidate to long-term if exceeds max
    if (this.shortTermMemory.length > this.maxShortTermSize) {
      const oldest = this.shortTermMemory.shift();
      if (oldest) {
        this.consolidateToLongTerm(oldest);
      }
    }

    // Update topic memory
    for (const topic of turn.topics) {
      if (this.longTermMemory.has(topic)) {
        const memory = this.longTermMemory.get(topic)!;
        memory.mentions += 1;
        memory.lastMentioned = new Date();
        memory.associatedQuestions.push(turn.question);
      } else {
        this.longTermMemory.set(topic, {
          topic,
          firstMentioned: new Date(),
          lastMentioned: new Date(),
          mentions: 1,
          associatedQuestions: [turn.question],
          relevanceScore: 0.5,
        });
      }
    }
  }

  private consolidateToLongTerm(turn: ConversationTurn): void {
    // Extract key topics from consolidated turn
    for (const topic of turn.topics) {
      if (this.longTermMemory.has(topic)) {
        const memory = this.longTermMemory.get(topic)!;
        memory.mentions += 1;
        memory.lastMentioned = new Date();
      } else {
        this.longTermMemory.set(topic, {
          topic,
          firstMentioned: new Date(),
          lastMentioned: new Date(),
          mentions: 1,
          associatedQuestions: [turn.question],
          relevanceScore: 0.5,
        });
      }
    }
  }

  findRelevantExperience(topic: string): string[] {
    const relevant: string[] = [];

    for (const [memoryTopic, memory] of this.longTermMemory) {
      if (this.calculateSimilarity(topic, memoryTopic) > 0.6) {
        relevant.push(...memory.associatedQuestions.slice(0, 2));
      }
    }

    return relevant;
  }

  private calculateSimilarity(topic1: string, topic2: string): number {
    const t1 = topic1.toLowerCase();
    const t2 = topic2.toLowerCase();

    if (t1 === t2) return 1;

    // Simple word-based similarity
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));

    const intersection = Array.from(words1).filter(w => words2.has(w)).length;
    const union = words1.size + words2.size - intersection;

    return intersection / union;
  }

  predictNextQuestion(): string | null {
    if (this.shortTermMemory.length === 0) return null;

    const lastTurn = this.shortTermMemory[this.shortTermMemory.length - 1];
    const lastTopic = lastTurn.topics[0];

    if (!lastTopic) return null;

    // Common follow-up patterns
    const followUps: Record<string, string[]> = {
      experience: [
        'Can you tell me about a challenging project you worked on?',
        'How did you approach a difficult situation?',
      ],
      technical: [
        'What alternatives did you consider?',
        'How would you scale this?',
      ],
      behavioral: [
        'What did you learn from that?',
        'How would you handle it differently now?',
      ],
    };

    const options = followUps[lastTopic] || [];
    return options[Math.floor(Math.random() * options.length)] || null;
  }

  getShortTermMemory(): ConversationTurn[] {
    return [...this.shortTermMemory];
  }

  getLongTermMemory(): TopicMemory[] {
    return Array.from(this.longTermMemory.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  clearMemory(): void {
    this.shortTermMemory = [];
    this.longTermMemory.clear();
  }
}
