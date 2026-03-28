export type ResponseStyle = 'auto' | 'bullet' | 'table' | 'code' | 'star' | 'concise' | 'detailed';

export class ResponseFormatter {
  private style: ResponseStyle = 'auto';

  setStyle(style: ResponseStyle) {
    this.style = style;
  }

  enhancePrompt(basePrompt: string, question: string, intent: any): string {
    let instruction = '';
    switch (this.style) {
      case 'bullet':
        instruction = `Format your answer as bullet points. Start with a brief intro, then list 3-5 key points.`;
        break;
      case 'table':
        instruction = `Format your answer as a markdown table with columns: Aspect, Description, Example. Include 3-5 rows.`;
        break;
      case 'code':
        instruction = `Include relevant code snippets in \`\`\`language blocks, with brief explanations.`;
        break;
      case 'star':
        instruction = `Use the STAR method: Situation, Task, Action, Result.`;
        break;
      case 'concise':
        instruction = `Keep your answer under 30 seconds when spoken. Be direct.`;
        break;
      case 'detailed':
        instruction = `Provide a comprehensive answer (1-2 minutes). Include examples and trade-offs.`;
        break;
      default: // auto
        if (intent.type === 'technical') {
          instruction = `Use technical details and code snippets where appropriate.`;
        } else if (intent.type === 'behavioral') {
          instruction = `Use the STAR method (Situation, Task, Action, Result).`;
        }
    }
    return instruction ? `${basePrompt}\n\nFormatting Instruction: ${instruction}` : basePrompt;
  }

  postProcess(response: string, style: ResponseStyle): string {
    // Optional: post-process response to ensure formatting consistency
    return response;
  }
}
