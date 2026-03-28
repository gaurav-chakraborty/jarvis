import { LLMService } from '../services/LLMService';
import { LocalLLM } from '../services/LocalLLM';
import { ComplexityClassifier } from './ComplexityClassifier';
import { VectorCache } from './VectorCache';
import { IConfig, ILogger, LLMRequest, LLMResponse } from '../types';

export class LLMRouter {
  private fastModel: LLMService;
  private premiumModel: LLMService;
  private localLLM: LocalLLM;
  private classifier: ComplexityClassifier;
  private cache: VectorCache;
  private pendingRequests = new Map<string, Promise<LLMResponse>>();
  private speculativeCache = new Map<string, LLMResponse>();

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
    this.cache = new VectorCache(dataPath, logger);
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // 1. Check Speculative Cache (0ms latency hit)
    const speculative = this.speculativeCache.get(request.question.toLowerCase().trim());
    if (speculative) {
      this.logger.info(`[Router] Speculative hit for: ${request.question.substring(0, 30)}...`);
      this.speculativeCache.delete(request.question.toLowerCase().trim());
      return { ...speculative, metadata: { ...speculative.metadata, speculative_hit: true } };
    }

    // 2. Deduplication
    const requestKey = this.getRequestKey(request);
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const promise = this._generateResponse(request);
    this.pendingRequests.set(requestKey, promise);
    
    try {
      const response = await promise;
      // 3. Trigger Speculative Pre-fetching for likely follow-ups
      this.triggerSpeculativePrefetch(request, response);
      return response;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async _generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // 1. Prune Context for stable latency
    const prunedRequest = this.pruneContext(request);

    // 2. Try Vector Cache
    const cached = await this.cache.get(prunedRequest.question);
    if (cached) return { ...cached, cached: true };

    // 3. Try API models
    try {
      const complexity = this.classifier.classify(prunedRequest.question, prunedRequest.intent);
      const model = complexity.model === 'fast' ? this.fastModel : this.premiumModel;
      const response = await model.generateResponse(prunedRequest);
      if (response.confidence > 0.7) await this.cache.set(prunedRequest.question, response);
      return response;
    } catch (apiError) {
      this.logger.warn(`[Router] API failed, falling back to local: ${apiError}`);
      return this.localLLM.generate(prunedRequest);
    }
  }

  private pruneContext(request: LLMRequest): LLMRequest {
    // Multi-tiered Context Pruning:
    // 1. Keep last 2 memories in full
    // 2. Summarize older memories (placeholder for summarization logic)
    // 3. Limit knowledge graph items to top 3
    return {
      ...request,
      memories: request.memories?.slice(-2),
      knowledgeGraph: request.knowledgeGraph?.slice(-3)
    };
  }

  private async triggerSpeculativePrefetch(request: LLMRequest, response: LLMResponse) {
    // Predict likely follow-ups based on the current question and response
    const followUps = this.predictFollowUps(request.question, response.text);
    
    for (const followUp of followUps) {
      if (this.speculativeCache.has(followUp.toLowerCase().trim())) continue;

      // Generate in background using the fast model
      this.fastModel.generateResponse({
        ...request,
        question: followUp,
        intent: { type: 'technical' } // Default to technical for follow-ups
      }).then(res => {
        this.speculativeCache.set(followUp.toLowerCase().trim(), res);
        // Auto-expire speculative entries after 5 minutes
        setTimeout(() => this.speculativeCache.delete(followUp.toLowerCase().trim()), 300000);
      }).catch(() => {});
    }
  }

  private predictFollowUps(question: string, response: string): string[] {
    const followUps: string[] = [];
    const q = question.toLowerCase();
    
    if (q.includes('architecture') || q.includes('design')) {
      followUps.push("What are the trade-offs of this architecture?");
      followUps.push("How would you scale this system?");
    } else if (q.includes('experience') || q.includes('project')) {
      followUps.push("What was the most challenging part of this project?");
      followUps.push("What would you do differently if you started today?");
    } else if (q.includes('technical') || q.includes('code')) {
      followUps.push("How do you handle error cases in this implementation?");
      followUps.push("What is the time complexity of this approach?");
    }
    
    return followUps;
  }

  private getRequestKey(request: LLMRequest): string {
    return `${request.question}:${request.intent.type}`;
  }
}
