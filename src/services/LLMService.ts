import { IConfig, ILogger, LLMRequest, LLMResponse } from '../types/index';

export class LLMService {
  private apiKey: string;
  private model: string = 'gemini-pro';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private config: IConfig, private logger: ILogger) {
    this.apiKey = config.geminiApiKey || process.env['GEMINI_API_KEY'] || '';
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
      const responseText = await this.callGeminiAPI(prompt);
      return {
        text: responseText,
        confidence: this.calculateConfidence(responseText, request),
        strategy: request.strategy.name,
        timestamp: new Date(),
        metadata: { tokens: responseText.length, model: this.model },
      };
    } catch (error) {
      this.logger.error('LLM API error:', error);
      return this.generateFallbackResponse(request);
    }
  }

  async generateStreamingResponse(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const prompt = this.buildPrompt(request);
    const fullResponse = await this.callGeminiAPI(prompt);
    onChunk(fullResponse);
  }

  private buildPrompt(request: LLMRequest): string {
    const { question, intent, strategy, memories, knowledgeGraph } = request;

    let prompt = `You are Jarvis, an AI assistant helping during a job interview.\n\n`;

    if (memories && memories.length > 0) {
      prompt += `Previous relevant interactions:\n`;
      for (const memory of memories.slice(-2)) {
        prompt += `- ${memory.content}\n`;
      }
      prompt += `\n`;
    }

    if (knowledgeGraph && knowledgeGraph.length > 0) {
      prompt += `Relevant knowledge from your experience:\n`;
      for (const item of knowledgeGraph.slice(-2)) {
        prompt += `- ${item}\n`;
      }
      prompt += `\n`;
    }

    prompt += `Strategy to use: ${strategy.name} - ${strategy.description}\n\n`;

    switch (intent.type) {
      case 'technical':
        prompt += `Provide a technically detailed answer with specific examples, metrics, and trade-offs.\n`;
        break;
      case 'experience':
        prompt += `Use the STAR method (Situation, Task, Action, Result) with a concrete example.\n`;
        break;
      case 'behavioral':
        prompt += `Share a specific story that demonstrates soft skills and problem-solving.\n`;
        break;
      case 'motivation':
        prompt += `Connect your answer to the company's mission and your career goals.\n`;
        break;
      default:
        break;
    }

    prompt += `\nInterview Question: ${question}\n\n`;
    prompt += `Provide a natural, conversational answer that sounds human and authentic. Keep it concise (30-60 seconds when spoken).\n\nAnswer:`;

    return prompt;
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
    let confidence = 0.7;

    if (response.length > 100) confidence += 0.1;
    if (response.length > 200) confidence += 0.1;
    if (/\d+%/.test(response)) confidence += 0.05;
    if (/\d+ (million|thousand)/i.test(response)) confidence += 0.05;

    const questionWords = new Set(request.question.toLowerCase().split(/\s+/));
    const responseWords = new Set(response.toLowerCase().split(/\s+/));
    const overlap = [...questionWords].filter(w => responseWords.has(w)).length;
    confidence += Math.min(overlap / 20, 0.1);

    return Math.min(confidence, 0.95);
  }
}
