import { Intent } from '../types';

export interface ComplexityScore {
  score: number;
  model: 'fast' | 'premium';
  reasoning: string;
}

export class ComplexityClassifier {
  private technicalKeywords = new Set([
    'algorithm', 'architecture', 'system design', 'scalability', 'database',
    'optimization', 'performance', 'concurrency', 'distributed', 'microservices',
    'kubernetes', 'docker', 'ci/cd', 'api design', 'graphql', 'rest', 'cache'
  ]);

  classify(question: string, intent: Intent): ComplexityScore {
    const words = question.toLowerCase().split(/\s+/);
    let techCount = 0;
    for (const w of words) {
      if (this.technicalKeywords.has(w)) techCount++;
    }
    
    const techDensity = techCount / Math.max(words.length, 1);
    const lengthScore = Math.min(question.length / 200, 1);
    
    let intentScore = 0.2;
    if (intent.type === 'technical') intentScore = 0.9;
    if (intent.type === 'systemDesign') intentScore = 1.0;
    if (intent.type === 'behavioral') intentScore = 0.6;
    if (intent.type === 'experience') intentScore = 0.5;
    if (intent.type === 'motivation') intentScore = 0.3;

    // Weighted score: 30% length, 40% technical density, 30% intent
    const score = lengthScore * 0.3 + techDensity * 0.4 + intentScore * 0.3;
    
    // Default threshold is 0.65
    const model = score > 0.65 ? 'premium' : 'fast';
    
    return { 
      score, 
      model, 
      reasoning: `len:${lengthScore.toFixed(2)} tech:${techDensity.toFixed(2)} intent:${intentScore.toFixed(2)}` 
    };
  }
}
