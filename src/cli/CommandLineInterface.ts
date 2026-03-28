import * as readline from 'readline';
import { AgentCore } from '../core/AgentCore';
import { Decision, Intent, Strategy, MemoryItem, Transcript } from '../types/index';

export class CommandLineInterface {
  private rl: readline.Interface;

  constructor(private agent: AgentCore) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'jarvis> ',
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.agent.on('ready', () => {
      console.log('\n✅ Jarvis is ready and listening');
      this.rl.prompt();
    });

    this.agent.on('processing', (transcript: Transcript) => {
      console.log(`\n🎤 Hearing: "${transcript.text}"`);
    });

    this.agent.on('intent-detected', (intent: Intent) => {
      console.log(`🧠 Intent: ${intent.type} (${Math.round(intent.score * 100)}% confidence)`);
    });

    this.agent.on('memory-recalled', (memories: MemoryItem[]) => {
      if (memories.length > 0) {
        console.log(`💾 Recalled ${memories.length} memory item(s)`);
      }
    });

    this.agent.on('strategy-selected', (strategy: Strategy) => {
      console.log(`📋 Strategy: ${strategy.name}`);
    });

    this.agent.on('decision-made', (decision: Decision) => {
      if (decision.shouldAct) {
        console.log(`⚡ Action: ${decision.action} (${Math.round(decision.confidence * 100)}% confidence)`);
        console.log(`💭 Reasoning: ${decision.reasoning}`);
      }
    });

    this.agent.on('action-executed', (decision: Decision) => {
      console.log(`✅ Executed: ${decision.action}`);
      const preview = decision.response.substring(0, 100);
      console.log(`📝 Response: ${preview}${decision.response.length > 100 ? '...' : ''}`);
    });

    this.agent.on('error', (error: Error) => {
      console.error(`❌ Error: ${error.message}`);
    });
  }

  start(): void {
    console.log('Jarvis Agentic CLI - Type commands or let the agent work autonomously');
    console.log('Commands:');
    console.log('  /status     - Show agent status');
    console.log('  /autonomy N - Set autonomy level (0-1)');
    console.log('  /metrics    - Show performance metrics');
    console.log('  /help       - Show this help');
    console.log('  /quit       - Exit');
    console.log('');

    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      const input = line.trim();

      if (input.startsWith('/')) {
        await this.handleCommand(input);
      } else if (input.length > 0) {
        await this.agent.handleTranscript({
          text: input,
          confidence: 1.0,
          timestamp: new Date(),
        });
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('Goodbye!');
      process.exit(0);
    });
  }

  private async handleCommand(command: string): Promise<void> {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/status': {
        const state = await this.agent.getState();
        console.log(`Status: ${state}`);
        break;
      }

      case '/autonomy': {
        const level = parseFloat(parts[1]);
        if (!isNaN(level) && level >= 0 && level <= 1) {
          await this.agent.setAutonomyLevel(level);
          console.log(`Autonomy level set to ${level}`);
        } else {
          console.log('Usage: /autonomy 0.5 (0-1)');
        }
        break;
      }

      case '/metrics': {
        const metrics = await this.agent.getMetrics();
        console.log(JSON.stringify(metrics, null, 2));
        break;
      }

      case '/help':
        console.log(`
Commands:
  /status     - Show agent status
  /autonomy N - Set autonomy level (0=manual, 0.5=balanced, 1=full auto)
  /metrics    - Show performance metrics
  /quit       - Exit
        `);
        break;

      case '/quit':
        this.rl.close();
        break;

      default:
        console.log(`Unknown command: ${cmd}`);
    }
  }
}
