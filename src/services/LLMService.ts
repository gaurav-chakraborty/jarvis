import { IConfig, ILogger, LLMRequest, LLMResponse } from '../types/index';

export class LLMService {
  private apiKey: string;
  private model: string = 'gemini-1.5-flash';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private maxRetries = 3;

  constructor(private config: IConfig, private logger: ILogger) {
    this.apiKey = config.geminiApiKey || process.env['GEMINI_API_KEY'] || '';
    this.model = config.model || 'gemini-1.5-flash';
    if (!this.apiKey) {
      this.logger.warn('No Gemini API key found, using fallback responses');
    }
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      return this.generateFallbackResponse(request);
    }

    const prompt = this.buildPrompt(request);

    try {
      const responseText = await this.callGeminiWithRetry(prompt);
      return {
        text: responseText,
        confidence: this.calculateConfidence(responseText, request),
        strategy: request.strategy.name,
        timestamp: new Date(),
        metadata: { tokens: responseText.length, model: this.model },
      };
    } catch (error) {
      this.logger.error('LLM API error after retries:', error);
      throw error; // Let the router handle the ultimate fallback
    }
  }

  async generateStreamingResponse(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    if (!this.apiKey) {
      const fallback = this.generateFallbackResponse(request);
      onChunk(fallback.text);
      return fallback;
    }

    const prompt = this.buildPrompt(request);
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Streaming API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Gemini streaming returns a JSON array of candidates
        try {
          const jsonStr = chunk.trim().replace(/^\[/, '').replace(/\]$/, '');
          const parts = jsonStr.split('},{').map((p, i, a) => {
            if (i > 0) p = '{' + p;
            if (i < a.length - 1) p = p + '}';
            return p;
          });

          for (const part of parts) {
            const data = JSON.parse(part);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;
              onChunk(text);
            }
          }
        } catch (e) {
          // Handle potential partial JSON chunks
        }
      }

      return {
        text: fullText,
        confidence: 0.85,
        strategy: request.strategy.name,
        timestamp: new Date(),
        metadata: { model: this.model, streamed: true }
      };
    } catch (error) {
      this.logger.error('Streaming error:', error);
      // Fallback to non-streaming if streaming fails
      return this.generateResponse(request);
    }
  }

  private async callGeminiWithRetry(prompt: string): Promise<string> {
    let lastError: any;
    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        if (i > 0) {
          const delay = Math.pow(2, i) * 1000;
          this.logger.info(`Retrying API request (attempt ${i}/${this.maxRetries}) in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return await this.callGeminiAPI(prompt);
      } catch (error) {
        lastError = error;
        this.logger.warn(`API attempt ${i + 1} failed: ${error}`);
      }
    }
    throw lastError;
  }

  private buildPrompt(request: LLMRequest): string {
    const { question, intent, strategy, memories, knowledgeGraph, context } = request;

    return `
# IDENTITY
You are Jarvis, a highly sophisticated AI assistant designed to provide real-time guidance during professional job interviews. Your goal is to help the candidate provide high-quality, authentic, and impactful answers.

# CONTEXT
- **Interview Stage**: ${context?.stage || 'General'}
- **Current Strategy**: ${strategy.name}
- **Strategy Goal**: ${strategy.description}
- **Intent Detected**: ${intent.type}

${memories && memories.length > 0 ? `
# RELEVANT MEMORY
${memories.slice(-3).map(m => `- ${m.content}`).join('\n')}
` : ''}

${knowledgeGraph && knowledgeGraph.length > 0 ? `
# EXPERTISE & KNOWLEDGE
${knowledgeGraph.slice(-3).map(k => `- ${k}`).join('\n')}
` : ''}

# GUIDELINES
1. **Authenticity**: Answers must sound human, not robotic. Use natural transitions.
2. **Conciseness**: Keep the response between 45-90 seconds of speaking time (approx. 100-200 words).
3. **Structure**: 
   - If technical: Focus on architecture, trade-offs, and specific technologies.
   - If behavioral/experience: Use a condensed STAR method (Situation, Task, Action, Result).
   - If motivational: Align personal values with company mission.
4. **Tone**: Maintain a professional yet approachable tone.

# INTERVIEWER QUESTION
"${question}"

# RESPONSE FORMAT
Provide only the suggested answer text. Do not include meta-commentary or labels.

Answer:`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 300,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error('No response from Gemini API');
  }

  private generateFallbackResponse(request: LLMRequest): LLMResponse {
    const templates: Record<string, string> = {
      technical:
        "Based on my experience, I've worked extensively with these technologies. In my previous role, I implemented a solution that improved performance by 40% through careful optimization and architectural decisions.",
      experience:
        "I've had the opportunity to work on several challenging projects. One that stands out involved leading a team of 5 engineers to build a scalable analytics platform that processed over 10 million events daily.",
      behavioral:
        'There was a situation where we faced conflicting priorities. I facilitated a meeting to align stakeholders, established clear milestones, and we successfully delivered the project ahead of schedule.',
      motivation:
        "I'm passionate about this role because it combines my technical skills with the opportunity to build products that have real impact. I've been following your company's work in this space and I'm excited about the direction.",
      general:
        "That's an excellent question. Based on my background and experience, I would approach this by first understanding the requirements, then designing a solution that balances performance with maintainability.",
    };

    const text = templates[request.intent.type] ?? templates['general'];

    return {
      text,
      confidence: 0.7,
      strategy: request.strategy.name,
      timestamp: new Date(),
      metadata: { fallback: true },
    };
  }

  private calculateConfidence(response: string, request: LLMRequest): number {
    let confidence = 0.75;

    // Penalty for too short responses
    if (response.length < 50) confidence -= 0.2;
    
    // Bonus for well-structured content
    if (response.length > 150) confidence += 0.05;
    if (response.includes('\n')) confidence += 0.05;
    
    // Check for presence of key technical or action verbs
    const actionVerbs = ['implemented', 'designed', 'led', 'optimized', 'solved', 'managed', 'developed'];
    const hasActionVerb = actionVerbs.some(verb => response.toLowerCase().includes(verb));
    if (hasActionVerb) confidence += 0.05;

    // Semantic relevance check (simple word overlap)
    const questionWords = new Set(request.question.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const responseWords = new Set(response.toLowerCase().split(/\s+/));
    const overlap = [...questionWords].filter(w => responseWords.has(w)).length;
    const overlapRatio = questionWords.size > 0 ? overlap / questionWords.size : 0;
    
    confidence += Math.min(overlapRatio * 0.2, 0.1);

    return Math.max(0.1, Math.min(confidence, 0.98));
  }
}
