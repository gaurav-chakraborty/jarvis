import React from 'react';
import { Copy, Check } from 'lucide-react';

interface AnswerPanelProps {
  answer: string | null;
  isGenerating?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

export function AnswerPanel({
  answer,
  isGenerating = false,
  onCopy,
  copied = false,
}: AnswerPanelProps) {
  return (
    <div className="flex-1 flex flex-col p-4 border-t border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-300">
          {isGenerating ? 'Generating Answer...' : 'Suggested Answer'}
        </div>

        {answer && onCopy && (
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Copy answer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {answer ? (
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {answer}
            {isGenerating && (
              <span className="animate-pulse ml-1">▋</span>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-600 py-8">
            {isGenerating ? 'Thinking...' : 'Answer will appear here'}
          </div>
        )}
      </div>
    </div>
  );
}
