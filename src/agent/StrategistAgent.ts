import {
  InterviewPhase,
  InterviewerMood,
  StrategyType,
  Strategy,
} from '../types/agent';

export class StrategistAgent {
  private interviewPhase: InterviewPhase = 'opening';
  private interviewerMood: InterviewerMood = 'neutral';
  private questionDifficulty: number = 0.5;
  private responseQuality: number = 0.5;

  analyzeSentiment(text: string): InterviewerMood {
    const lowerText = text.toLowerCase();

    const positiveIndicators = [
      'great', 'excellent', 'interesting', 'good', 'nice', 'impressive',
      'cool', 'wow', 'that\'s useful', 'i like that',
    ];

    const negativeIndicators = [
      'hmm', 'hmm...', 'i see', 'awkward', 'unclear', 'confused',
      'not sure', 'doesn\'t make sense', 'that\'s wrong',
    ];

    const positiveMatches = positiveIndicators.filter(ind =>
      lowerText.includes(ind)
    ).length;

    const negativeMatches = negativeIndicators.filter(ind =>
      lowerText.includes(ind)
    ).length;

    if (positiveMatches > negativeMatches) return 'engaged';
    if (negativeMatches > positiveMatches) return 'confused';
    return 'neutral';
  }

  getCurrentStrategy(): Strategy {
    let strategyType: StrategyType = 'build_rapport';
    let tacticalAdjustments: string[] = [];
    let talkingPoints: string[] = [];

    switch (this.interviewPhase) {
      case 'opening':
        strategyType = 'build_rapport';
        talkingPoints = [
          'Show enthusiasm',
          'Share relevant background',
          'Ask clarifying questions',
        ];
        break;
      case 'technical':
        if (this.interviewerMood === 'engaged' && this.responseQuality > 0.7) {
          strategyType = 'show_depth';
          talkingPoints = [
            'Advanced concepts',
            'Optimization strategies',
            'Architecture decisions',
          ];
        } else if (this.interviewerMood === 'confused') {
          strategyType = 'simplify_clarify';
          talkingPoints = [
            'Core concepts',
            'Simple analogies',
            'Clear examples',
          ];
        } else {
          strategyType = 'use_star';
          talkingPoints = [
            'Situation',
            'Task',
            'Action',
            'Result',
          ];
        }
        break;
      case 'behavioral':
        strategyType = 'use_star';
        talkingPoints = [
          'Situation - set context',
          'Task - your role',
          'Action - what you did',
          'Result - outcome',
        ];
        break;
      case 'closing':
        strategyType = 'ask_smart_questions';
        talkingPoints = [
          'Team dynamics',
          'Success metrics',
          'Next steps',
          'Growth opportunities',
        ];
        break;
    }

    // Adjust based on interviewer mood
    if (this.interviewerMood === 'skeptical') {
      tacticalAdjustments.push('Provide concrete evidence');
      tacticalAdjustments.push('Use metrics and data');
    }

    if (this.interviewerMood === 'confused') {
      tacticalAdjustments.push('Simplify language');
      tacticalAdjustments.push('Add more examples');
    }

    return {
      type: strategyType,
      tacticalAdjustments,
      talkingPoints,
      confidenceThreshold: 0.7,
    };
  }

  suggestTalkingPoints(): string[] {
    const strategy = this.getCurrentStrategy();
    return strategy.talkingPoints;
  }

  setPhase(phase: InterviewPhase): void {
    this.interviewPhase = phase;
  }

  setMood(mood: InterviewerMood): void {
    this.interviewerMood = mood;
  }

  setResponseQuality(quality: number): void {
    this.responseQuality = Math.max(0, Math.min(1, quality));
  }

  setQuestionDifficulty(difficulty: number): void {
    this.questionDifficulty = Math.max(0, Math.min(1, difficulty));
  }

  getPhase(): InterviewPhase {
    return this.interviewPhase;
  }

  getMood(): InterviewerMood {
    return this.interviewerMood;
  }
}
