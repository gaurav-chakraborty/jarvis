import { EventEmitter } from 'events';
import { AudioCaptureBridge } from '../bridges/AudioCaptureBridge';
import { LLMService } from '../services/LLMService';
import { MemoryStore } from '../memory/MemoryStore';
import { IntentClassifier } from '../intent/IntentClassifier';
import { StrategySelector } from '../strategy/StrategySelector';
import { ActionExecutor } from '../actions/ActionExecutor';
import { ConversationAnalyzer } from '../analysis/ConversationAnalyzer';
import { KnowledgeGraph } from '../knowledge/KnowledgeGraph';
import {
  IConfig,
  ILogger,
  AgentState,
  Transcript,
  Intent,
  Strategy,
  Decision,
  ConversationTurn,
} from '../types/index';

export class AgentCore extends EventEmitter {
  private state: AgentState = 'idle';
  private audioBridge: AudioCaptureBridge;
  private llm: LLMService;
  private memory: MemoryStore;
  private intentClassifier: IntentClassifier;
  private strategySelector: StrategySelector;
  private actionExecutor: ActionExecutor;
  private conversationAnalyzer: ConversationAnalyzer;
  private knowledgeGraph: KnowledgeGraph;

  private currentTranscript: Transcript | null = null;
  private lastDecision: Decision | null = null;
  private autonomyLevel: number = 0.7;
  private confidenceThreshold: number = 0.75;

  constructor(private config: IConfig, private logger: ILogger) {
    super();
    this.initializeComponents();
  }

  private initializeComponents() {
    this.audioBridge = new AudioCaptureBridge(this.config, this.logger);
    this.llm = new LLMService(this.config, this.logger);
    this.memory = new MemoryStore(this.config, this.logger);
    this.intentClassifier = new IntentClassifier(this.config, this.logger);
    this.strategySelector = new StrategySelector(this.config, this.logger);
    this.actionExecutor = new ActionExecutor(this.config, this.logger);
    this.conversationAnalyzer = new ConversationAnalyzer(this.logger);
    this.knowledgeGraph = new KnowledgeGraph(this.config, this.logger);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Jarvis Agent Core...');

    await this.audioBridge.initialize();
    this.audioBridge.on('transcript', this.handleTranscript.bind(this));
    this.audioBridge.on('audio-level', (level: number) => {
      this.emit('audio-level', level);
    });

    await this.memory.load();
    await this.knowledgeGraph.initialize(this.config.userContext);

    this.setupEventHandlers();

    this.state = 'listening';
    this.logger.info('✅ Jarvis Agent Core initialized and listening');
    this.emit('ready', { timestamp: new Date() });
  }

  private setupEventHandlers(): void {
    this.on('decision-made', async (decision: Decision) => {
      if (decision.shouldAct && decision.confidence >= this.confidenceThreshold) {
        await this.actionExecutor.execute(decision.action, decision.response);
        this.emit('action-executed', decision);
      }
    });

    this.on('context-changed', async (context: unknown) => {
      await this.knowledgeGraph.updateContext(context);
      this.strategySelector.updateContext(context);
    });
  }

  async handleTranscript(transcript: Transcript): Promise<void> {
    this.currentTranscript = transcript;
    this.state = 'processing';
    this.emit('processing', transcript);

    try {
      const context = await this.conversationAnalyzer.analyze(
        transcript.text,
        this.memory.getRecentInteractions(5)
      );

      const intent = await this.intentClassifier.classify(transcript.text, context);
      this.emit('intent-detected', intent);

      const memories = await this.memory.recall(transcript.text, 3);
      this.emit('memory-recalled', memories);

      const strategy = await this.strategySelector.select(intent, context, memories);
      this.emit('strategy-selected', strategy);

      const response = await this.llm.generateResponse({
        question: transcript.text,
        intent,
        strategy,
        context,
        memories,
        knowledgeGraph: await this.knowledgeGraph.query(transcript.text),
      });

      const decision = this.makeDecision(intent, response, strategy);
      this.lastDecision = decision;
      this.emit('decision-made', decision);

      const turn: ConversationTurn = {
        transcript,
        intent,
        response,
        strategy,
        decision,
        timestamp: new Date(),
      };
      await this.memory.store(turn);

      await this.knowledgeGraph.learn({
        input: transcript.text,
        output: response.text,
        confidence: response.confidence,
        context: { intent, strategy },
      });

      this.state = 'listening';
      this.emit('processed', { transcript, response, decision });
    } catch (error) {
      this.logger.error('Error processing transcript:', error);
      this.state = 'error';
      this.emit('error', error);
      await this.handleFallback(transcript);
    }
  }

  private makeDecision(intent: Intent, response: { text: string; confidence: number }, strategy: Strategy): Decision {
    let shouldAct = false;
    let actionType = 'none';
    const reasoning: string[] = [];

    const confidence = response.confidence;

    if (this.autonomyLevel >= 0.9) {
      if (confidence > 0.7) {
        shouldAct = true;
        actionType = 'autoCopyAndDisplay';
        reasoning.push('High autonomy mode: auto-acting on confident response');
      }
    } else if (this.autonomyLevel >= 0.6) {
      if (confidence > 0.8 && (intent.type === 'technical' || intent.type === 'motivation')) {
        shouldAct = true;
        actionType = 'autoDisplay';
        reasoning.push('Medium autonomy: displaying technical/motivation response');
      } else if (confidence > 0.9) {
        shouldAct = true;
        actionType = 'autoCopyAndDisplay';
        reasoning.push('Medium autonomy: auto-copying very confident response');
      }
    } else {
      if (confidence > 0.85) {
        shouldAct = false;
        actionType = 'suggest';
        reasoning.push('Low autonomy: suggesting response for user confirmation');
      }
    }

    if (intent.type === 'technical' && confidence > 0.85) {
      shouldAct = true;
      actionType = 'autoCopyAndDisplay';
      reasoning.push('Technical question override: high-confidence answer');
    }

    if (intent.type === 'closing' && confidence > 0.8) {
      shouldAct = true;
      actionType = 'suggestQuestion';
      reasoning.push('Closing detected: suggesting smart questions');
    }

    // Suppress unused variable warning
    void strategy;

    return {
      shouldAct,
      action: actionType,
      response: response.text,
      confidence,
      reasoning: reasoning.join('; '),
      timestamp: new Date(),
    };
  }

  private async handleFallback(transcript: Transcript): Promise<void> {
    const keywords: Record<string, string> = {
      experience: "Based on my experience, I've worked extensively with...",
      technical: 'Technically speaking, I approach this by...',
      motivation: "I'm passionate about this role because...",
    };

    let fallbackResponse = "That's a great question. Let me think about that...";
    for (const [key, value] of Object.entries(keywords)) {
      if (transcript.text.toLowerCase().includes(key)) {
        fallbackResponse = value;
        break;
      }
    }

    this.emit('fallback', fallbackResponse);
    await this.actionExecutor.execute('autoDisplay', fallbackResponse);
  }

  async setAutonomyLevel(level: number): Promise<void> {
    this.autonomyLevel = Math.min(1, Math.max(0, level));
    this.logger.info(`Autonomy level set to ${this.autonomyLevel}`);
    this.emit('autonomy-changed', this.autonomyLevel);
  }

  async setContext(context: unknown): Promise<void> {
    await this.knowledgeGraph.updateContext(context);
    await this.memory.setContext(context);
    this.emit('context-changed', context);
  }

  async getState(): Promise<AgentState> {
    return this.state;
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    return {
      state: this.state,
      autonomyLevel: this.autonomyLevel,
      totalProcessed: this.memory.getTotalInteractions(),
      confidence: this.lastDecision?.confidence || 0,
      lastAction: this.lastDecision?.action || 'none',
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Jarvis Agent...');
    await this.audioBridge.shutdown();
    await this.memory.save();
    await this.knowledgeGraph.save();
    this.state = 'shutdown';
    this.emit('shutdown');
  }
}
