import { LLMRouter } from '../router/LLMRouter';
import { QuestionParser } from './QuestionParser';

export interface AssessmentResult {
  answer: string;
  explanation: string;
  optionNumber?: number;
  answerLetter?: string;
}

export class AssessmentHelper {
  constructor(private router: LLMRouter) {}

  async answerQuestion(rawText: string): Promise<AssessmentResult> {
    const parser = new QuestionParser();
    const parsed = parser.parse(rawText);
    
    // Build a prompt that asks for the answer and a short explanation
    let prompt = `You are an exam assistant. Answer the following question accurately and provide a brief explanation.\n\n`;
    
    if (parsed.type === 'mcq' && parsed.options && parsed.options.length > 0) {
      prompt += `Question: ${parsed.text}\nOptions:\n`;
      parsed.options.forEach((opt, idx) => {
        prompt += `${String.fromCharCode(65+idx)}. ${opt}\n`;
      });
      prompt += `\nOutput the correct answer letter (e.g., "A") and then a short explanation. Format: "Answer: X Explanation: ..."`;
    } else if (parsed.type === 'truefalse') {
      prompt += `Question: ${parsed.text}\nAnswer with "True" or "False" and a brief explanation. Format: "Answer: True/False Explanation: ..."`;
    } else if (parsed.type === 'code') {
      prompt += `Question: ${parsed.text}\nProvide the code snippet and a brief explanation of how it works.`;
    } else {
      prompt += `Question: ${parsed.text}\nProvide a concise answer with a short explanation.`;
    }
    
    const response = await this.router.generateResponse({ 
      question: prompt, 
      intent: { type: 'technical' },
      strategy: { name: 'assessment', description: 'Exam assistance' }
    } as any);
    
    // Parse the response to extract answer and explanation
    const answerMatch = response.text.match(/Answer:\s*([^\n]+)/i);
    const explanationMatch = response.text.match(/Explanation:\s*(.*)/is);
    const answer = answerMatch ? answerMatch[1].trim() : response.text;
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';
    
    // For MCQ, try to extract option number and letter
    let optionNumber: number | undefined;
    let answerLetter: string | undefined;
    
    if (parsed.type === 'mcq') {
      const letterMatch = response.text.match(/^Answer:\s*([A-D])/i) || response.text.match(/^([A-D])/i);
      if (letterMatch) {
        answerLetter = letterMatch[1].toUpperCase();
        optionNumber = answerLetter.charCodeAt(0) - 65;
      }
    }
    
    return { answer, explanation, optionNumber, answerLetter };
  }
}
