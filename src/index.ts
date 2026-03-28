#!/usr/bin/env node

import { AgentCore } from './core/AgentCore';
import { ConfigManager } from './config/ConfigManager';
import { Logger } from './utils/Logger';
import { CommandLineInterface } from './cli/CommandLineInterface';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🤖 JARVIS - Autonomous Interview Operating Entity      ║
║  Version: 0.1.0 | Mode: AGENTIC                         ║
║  Status: Listening for interview context...             ║
╚══════════════════════════════════════════════════════════╝
  `);

  const config = await ConfigManager.load();
  const logger = new Logger(config.logLevel);
  const agent = new AgentCore(config, logger);
  const cli = new CommandLineInterface(agent);

  await agent.initialize();

  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down Jarvis...');
    await agent.shutdown();
    process.exit(0);
  });

  cli.start();
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
