import { PredictedIntent, QuestionType } from '../types/agent';

export class IntentPredictorAgent {
  private questionStarters: Map<string, QuestionType> = new Map([
    ['tell me about', 'experience'],
    ['why do you', 'motivation'],
    ['how would you', 'technical'],
    ['what is your', 'personal'],
    ['describe a time', 'behavioral'],
    ['can you explain', 'technical'],
    ['what\'s your experience', 'experience'],
    ['walk me through', 'technical'],
    ['give me an example', 'behavioral'],
    ['have you ever', 'experience'],
  ]);

  private technicalKeywords = [
    'algorithm', 'database', 'api', 'architecture', 'design pattern',
    'optimize', 'scalability', 'performance', 'framework', 'code',
  ];

  private behavioralKeywords = [
    'conflict', 'challenge', 'failure', 'success', 'team', 'leadership',
    'difficult', 'pressure', 'deadline', 'disagreement',
  ];

  predictIntent(partialText: string): PredictedIntent {
    const lowerText = partialText.toLowerCase();
    let confidence = 0;
    let questionType: QuestionType = 'unknown';
    let topics: string[] = [];

    // Check for question starters
    for (const [starter, type] of this.questionStarters) {
      if (lowerText.includes(starter)) {
        questionType = type;
        confidence = 0.7 + Math.random() * 0.2;
        topics.push(type);
        break;
      }
    }

    // Check for technical keywords
    const technicalMatches = this.technicalKeywords.filter(keyword =>
      lowerText.includes(keyword)
    );
    if (technicalMatches.length > 0) {
      if (questionType === 'unknown') {
        questionType = 'technical';
        confidence = 0.6;
      } else if (questionType === 'technical') {
        confidence = Math.min(0.95, confidence + 0.1);
      }
      topics.push(...technicalMatches.slice(0, 2));
    }

    // Check for behavioral keywords
    const behavioralMatches = this.behavioralKeywords.filter(keyword =>
      lowerText.includes(keyword)
    );
    if (behavioralMatches.length > 0) {
      if (questionType === 'unknown') {
        questionType = 'behavioral';
        confidence = 0.6;
      } else if (questionType === 'behavioral') {
        confidence = Math.min(0.95, confidence + 0.1);
      }
      topics.push(...behavioralMatches.slice(0, 2));
    }

    // If still unknown, try to detect if it's a question
    if (questionType === 'unknown' && (lowerText.includes('?') || partialText.length > 10)) {
      confidence = 0.3;
    }

    return {
      type: questionType,
      question: partialText,
      confidence: Math.min(confidence, 1),
      topics: Array.from(new Set(topics)),
    };
  }

  shouldPreemptivelyPrepare(confidence: number): boolean {
    return confidence > 0.75;
  }

  generateSuggestedResponse(questionType: QuestionType): string {
    const responses: Record<QuestionType, string> = {
      technical: 'I would approach this by first understanding the requirements, then breaking it down into components...',
      behavioral: 'A situation where I faced this was... I handled it by taking these steps...',
      experience: 'In my previous role, I had the opportunity to... which taught me...',
      motivation: 'I\'m interested in this because... and I believe my background in...',
      personal: 'Personally, I value... and I think that\'s important because...',
      unknown: 'That\'s a great question. Let me think about that...',
    };

    return responses[questionType];
  }
}
