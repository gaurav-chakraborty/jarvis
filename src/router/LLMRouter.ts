import { LLMService } from '../services/LLMService';
import { LocalLLM } from '../services/LocalLLM';
import { ComplexityClassifier } from './ComplexityClassifier';
import { SemanticCache } from './SemanticCache';
import { IConfig, ILogger, LLMRequest, LLMResponse } from '../types';

export class LLMRouter {
  private fastModel: LLMService;
  private premiumModel: LLMService;
  private localLLM: LocalLLM;
  private classifier: ComplexityClassifier;
  private cache: SemanticCache;
  private pendingRequests = new Map<string, Promise<LLMResponse>>();

  constructor(config: IConfig, logger: ILogger) {
    this.fastModel = new LLMService({
      ...config,
      model: config.fastModel || 'gemini-1.5-flash',
      maxTokens: 200
    }, logger);
    
    this.premiumModel = new LLMService({
      ...config,
      model: config.premiumModel || 'gemini-1.5-pro',
      maxTokens: 500
    }, logger);
    
    this.localLLM = new LocalLLM();
    this.classifier = new ComplexityClassifier();
    
    const dataPath = config.dataPath || '/home/ubuntu/.jarvis/data';
    this.cache = new SemanticCache(dataPath, logger);
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // 1. Deduplication: Check if same question is already being processed
    const requestKey = this.getRequestKey(request);
    if (this.pendingRequests.has(requestKey)) {
      this.logger.info(`[Router] Deduplicating request for: ${request.question.substring(0, 30)}...`);
      return this.pendingRequests.get(requestKey)!;
    }

    const promise = this._generateResponse(request);
    this.pendingRequests.set(requestKey, promise);
    
    try {
      const response = await promise;
      return response;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async _generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // 1. Try cache first
    const cached = await this.cache.get(request.question);
    if (cached) return { ...cached, cached: true };

    // 2. Try API models
    try {
      const complexity = this.classifier.classify(request.question, request.intent);
      const model = complexity.model === 'fast' ? this.fastModel : this.premiumModel;
      const response = await model.generateResponse(request);
      if (response.confidence > 0.7) await this.cache.set(request.question, response);
      return response;
    } catch (apiError) {
      this.logger.warn(`[Router] API failed, falling back to local model: ${apiError}`);
    }

    // 3. Fallback to local model
    try {
      const localResponse = await this.localLLM.generate(request);
      await this.cache.set(request.question, localResponse);
      return localResponse;
    } catch (localError) {
      this.logger.error(`[Router] Local model failed: ${localError}`);
      return this.getUltimateFallback(request);
    }
  }

  async generateStreamingResponse(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    // 1. Try cache first
    const cached = await this.cache.get(request.question);
    if (cached) {
      onChunk(cached.text);
      return { ...cached, cached: true };
    }

    // 2. Try API models with streaming
    try {
      const complexity = this.classifier.classify(request.question, request.intent);
      const model = complexity.model === 'fast' ? this.fastModel : this.premiumModel;
      const response = await model.generateStreamingResponse(request, onChunk);
      if (response.confidence > 0.7) await this.cache.set(request.question, response);
      return response;
    } catch (apiError) {
      this.logger.warn(`[Router] Streaming API failed, falling back to local: ${apiError}`);
      // Fallback to local (non-streaming for now)
      const local = await this.localLLM.generate(request);
      onChunk(local.text);
      return local;
    }
  }

  private getRequestKey(request: LLMRequest): string {
    return `${request.question}:${request.intent.type}`;
  }

  private getUltimateFallback(request: LLMRequest): LLMResponse {
    return {
      text: "I'm currently offline and my local engine is warming up. Let's focus on the core aspects of your question while I reconnect.",
      confidence: 0.3,
      strategy: request.strategy.name,
      timestamp: new Date(),
      metadata: { ultimate_fallback: true }
    };
  }
}
