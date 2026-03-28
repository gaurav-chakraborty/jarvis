import React from 'react';
import { HelpCircle } from 'lucide-react';

interface QuestionDisplayProps {
  question: string;
  isPartial?: boolean;
}

export function QuestionDisplay({
  question,
  isPartial = false,
}: QuestionDisplayProps) {
  if (!question) {
    return (
      <div className="p-4 text-center text-gray-500">
        Waiting for question...
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />

        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">
            {isPartial ? 'Listening...' : 'Question'}
          </div>

          <div className="text-base text-white leading-relaxed">
            {question}
            {isPartial && (
              <span className="animate-pulse ml-1">|</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
