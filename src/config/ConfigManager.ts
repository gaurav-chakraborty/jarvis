import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { IConfig } from '../types/index';

export class ConfigManager {
  static async load(): Promise<IConfig> {
    const configPath = path.join(os.homedir(), '.jarvis', 'config.json');

    try {
      const data = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(data) as Partial<IConfig>;
      return this.mergeDefaults(config);
    } catch {
      return this.getDefaultConfig();
    }
  }

  static async save(config: IConfig): Promise<void> {
    const configDir = path.join(os.homedir(), '.jarvis');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(config, null, 2));
  }

  private static mergeDefaults(config: Partial<IConfig>): IConfig {
    const defaults = this.getDefaultConfig();
    return { ...defaults, ...config };
  }

  private static getDefaultConfig(): IConfig {
    return {
      geminiApiKey: process.env['GEMINI_API_KEY'] || '',
      autonomyLevel: parseFloat(process.env['AUTONOMY_LEVEL'] || '0.7'),
      confidenceThreshold: parseFloat(process.env['CONFIDENCE_THRESHOLD'] || '0.75'),
      logLevel: (process.env['LOG_LEVEL'] as IConfig['logLevel']) || 'info',
      dataPath: path.join(os.homedir(), '.jarvis', 'data'),
      userContext: {
        resume: '',
        jobDescription: '',
        role: process.env['INTERVIEW_ROLE'] || 'Software Engineer',
        company: process.env['INTERVIEW_COMPANY'] || '',
        interviewers: process.env['INTERVIEWERS']
          ? process.env['INTERVIEWERS'].split(',').map(s => s.trim())
          : [],
      },
    };
  }
}
