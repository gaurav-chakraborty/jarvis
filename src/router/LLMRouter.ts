import { LLMService } from '../services/LLMService';
import { ComplexityClassifier } from './ComplexityClassifier';
import { SemanticCache } from './SemanticCache';
import { IConfig, ILogger, LLMRequest, LLMResponse } from '../types';

export class LLMRouter {
  private fastModel: LLMService;
  private premiumModel: LLMService;
  private classifier: ComplexityClassifier;
  private cache: SemanticCache;

  constructor(config: IConfig, logger: ILogger) {
    // Initialize both model instances with different endpoints
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
    
    this.classifier = new ComplexityClassifier();
    
    // Use dataPath from config or default to ~/.jarvis/data
    const dataPath = config.dataPath || '/home/ubuntu/.jarvis/data';
    this.cache = new SemanticCache(dataPath, logger);
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // 1. Try cache first
    const cached = await this.cache.get(request.question);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Classify complexity
    const complexity = this.classifier.classify(request.question, request.intent);
    console.log(`[Router] Complexity: ${complexity.score.toFixed(2)} → using ${complexity.model} model`);

    // 3. Route to appropriate model
    const model = complexity.model === 'fast' ? this.fastModel : this.premiumModel;
    const response = await model.generateResponse(request);

    // 4. Store in cache if high confidence
    if (response.confidence > 0.7) {
      await this.cache.set(request.question, response);
    }
    
    return response;
  }
}
