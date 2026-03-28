export interface ParsedQuestion {
  type: 'mcq' | 'truefalse' | 'code' | 'definition' | 'fillblank' | 'radio' | 'unknown';
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

export class QuestionParser {
  parse(rawText: string): ParsedQuestion {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const text = lines.join(' ').trim();
    
    // MCQ detection: contains A) B) C) D) or 1. 2. 3. 4.
    const mcqPattern = /[A-D]\)|\d\.\s+[A-Z]/i;
    if (mcqPattern.test(text)) {
      const options = this.extractOptions(text);
      return { type: 'mcq', text, options };
    }
    
    // True/False
    if (/(true|false)\s*\?/i.test(text) || /(t|f)\s*\/\s*f/i.test(text)) {
      return { type: 'truefalse', text };
    }
    
    // Code snippet (look for code fences or typical code formatting)
    if (text.includes('```') || text.match(/function|class|def|import|#include/)) {
      return { type: 'code', text };
    }
    
    // Definition (look for "What is", "Define", etc.)
    if (/^what is|^define|^explain/i.test(text)) {
      return { type: 'definition', text };
    }
    
    return { type: 'unknown', text };
  }
  
  private extractOptions(text: string): string[] {
    const options: string[] = [];
    // Match patterns like A) Option, B. Option, etc.
    const regex = /([A-D][\)\.])\s*(.*?)(?=[A-D][\)\.]|$)/gs;
    let match;
    while ((match = regex.exec(text)) !== null) {
      options.push(match[2].trim());
    }
    
    // Fallback if the regex fails but we know it's an MCQ
    if (options.length === 0) {
      const simpleSplit = text.split(/\s[A-D][\)\.]\s/);
      if (simpleSplit.length > 1) {
        return simpleSplit.slice(1).map(o => o.trim());
      }
    }
    
    return options;
  }
}
