import * as keytar from 'node-keytar';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_NAME = 'com.gaurav.jarvis';

export interface UserPreferences {
  // API Keys
  geminiApiKey?: string;
  openAiApiKey?: string;
  // Model routing
  fastModel: string;
  premiumModel: string;
  complexityThreshold: number;
  // Response style
  responseStyle: 'auto' | 'bullet' | 'table' | 'code' | 'star' | 'concise' | 'detailed';
  // Autonomy
  autonomyLevel: number;
  confidenceThreshold: number;
  // Other
  firstRun: boolean;
}

export class Preferences {
  private static instance: Preferences;
  private prefs: UserPreferences;
  private filePath: string;

  private constructor() {
    // In a real Electron app, we'd use app.getPath('userData')
    // For this environment, we'll use a local .jarvis directory in home
    const userData = path.join(process.env.HOME || '/home/ubuntu', '.jarvis');
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }
    this.filePath = path.join(userData, 'preferences.json');
    this.prefs = this.loadSync();
  }

  static getInstance(): Preferences {
    if (!Preferences.instance) Preferences.instance = new Preferences();
    return Preferences.instance;
  }

  private loadSync(): UserPreferences {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    return this.getDefaults();
  }

  private getDefaults(): UserPreferences {
    return {
      fastModel: 'gemini-1.5-flash',
      premiumModel: 'gemini-1.5-pro',
      complexityThreshold: 0.65,
      responseStyle: 'auto',
      autonomyLevel: 0.7,
      confidenceThreshold: 0.75,
      firstRun: true
    };
  }

  async save(): Promise<void> {
    try {
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.prefs, null, 2));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  get(key: keyof UserPreferences): any {
    return this.prefs[key];
  }

  set(key: keyof UserPreferences, value: any): void {
    (this.prefs as any)[key] = value;
    this.save();
  }

  // Secure API key storage (keychain)
  async getApiKey(provider: 'gemini' | 'openai'): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, provider);
    } catch (error) {
      console.error(`Failed to get ${provider} API key from keychain:`, error);
      return null;
    }
  }

  async setApiKey(provider: 'gemini' | 'openai', key: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, provider, key);
    } catch (error) {
      console.error(`Failed to set ${provider} API key in keychain:`, error);
    }
  }

  async deleteApiKey(provider: 'gemini' | 'openai'): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, provider);
    } catch (error) {
      console.error(`Failed to delete ${provider} API key from keychain:`, error);
    }
  }
}
