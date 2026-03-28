import { spawn } from 'child_process';
import { LLMRequest, LLMResponse } from '../types/index';

export class LocalLLM {
  private modelName = 'phi3:mini'; // configurable
  private timeout = 30000; // 30 seconds

  async generate(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const prompt = this.buildPrompt(request);
      const process = spawn('ollama', ['run', this.modelName, prompt]);

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => { output += data.toString(); });
      process.stderr.on('data', (data) => { error += data.toString(); });
      
      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error('Local model timeout'));
      }, this.timeout);

      process.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0 && output.trim()) {
          resolve({
            text: output.trim(),
            confidence: 0.6, // local model less confident
            strategy: request.strategy.name,
            timestamp: new Date(),
            metadata: { model: this.modelName, offline: true }
          });
        } else {
          reject(new Error(`Local model failed: ${error || output}`));
        }
      });
    });
  }

  private buildPrompt(request: LLMRequest): string {
    return `You are Jarvis, an interview assistant. 
Question: ${request.question}
Provide a concise, helpful answer in 2-3 sentences.`;
  }
}
