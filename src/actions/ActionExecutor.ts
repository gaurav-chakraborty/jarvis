import { exec } from 'child_process';
import { promisify } from 'util';
import { IConfig, ILogger } from '../types/index';
import WebSocket from 'ws';

const execAsync = promisify(exec);

declare global {
  // eslint-disable-next-line no-var
  var nativeWebSocket: WebSocket | undefined;
}

export class ActionExecutor {
  constructor(private config: IConfig, private logger: ILogger) {
    void this.config;
  }

  async execute(actionType: string, payload: unknown): Promise<void> {
    this.logger.info(`Executing action: ${actionType}`);

    switch (actionType) {
      case 'autoCopyAndDisplay':
        await this.copyToClipboard(String(payload));
        await this.displayNotification(String(payload));
        break;

      case 'autoDisplay':
        await this.displayNotification(String(payload));
        break;

      case 'suggest':
        await this.suggestResponse(String(payload));
        break;

      case 'suggestQuestion':
        await this.suggestQuestion(String(payload));
        break;

      case 'switchContext':
        await this.switchContext(payload);
        break;

      case 'showTalkingPoints':
        await this.showTalkingPoints(payload as string[]);
        break;

      default:
        this.logger.warn(`Unknown action type: ${actionType}`);
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      // Use pbcopy on macOS for clipboard access
      await execAsync(`echo ${JSON.stringify(text)} | pbcopy`);
      this.logger.info('Copied to clipboard');

      await this.runAppleScript(
        `display notification "Answer copied to clipboard" with title "Jarvis"`
      );
    } catch (error) {
      this.logger.error('Failed to copy to clipboard:', error);
    }
  }

  private async displayNotification(text: string): Promise<void> {
    const truncated = text.length > 100 ? text.substring(0, 100) + '...' : text;
    const escaped = truncated.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    await this.runAppleScript(
      `display notification "${escaped}" with title "Jarvis Suggestion"`
    );

    this.sendToNativeWindow({ type: 'display', payload: text });
  }

  private async suggestResponse(text: string): Promise<void> {
    this.sendToNativeWindow({ type: 'suggest', payload: text });
  }

  private async suggestQuestion(text: string): Promise<void> {
    this.sendToNativeWindow({ type: 'questions', payload: text });
  }

  private async switchContext(context: unknown): Promise<void> {
    this.logger.info('Switching context:', context);
    this.sendToNativeWindow({ type: 'context', payload: context });
  }

  private async showTalkingPoints(points: string[]): Promise<void> {
    this.sendToNativeWindow({ type: 'talkingPoints', payload: points });
  }

  private async runAppleScript(script: string): Promise<void> {
    try {
      await execAsync(`osascript -e '${script}'`);
    } catch {
      // Notifications are not critical; fail silently
    }
  }

  private sendToNativeWindow(message: Record<string, unknown>): void {
    if (global.nativeWebSocket?.readyState === WebSocket.OPEN) {
      global.nativeWebSocket.send(JSON.stringify(message));
    }
  }
}
