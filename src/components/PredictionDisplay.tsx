import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PredictedIntent } from '../types/agent';

interface PredictionDisplayProps {
  predictedIntent: PredictedIntent | null;
}

export function PredictionDisplay({ predictedIntent }: PredictionDisplayProps) {
  if (!predictedIntent || predictedIntent.type === 'unknown') {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-orange-400">Agent Prediction</span>
        <span className="text-xs text-gray-400 ml-auto">
          {Math.round(predictedIntent.confidence * 100)}% confident
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="text-sm text-gray-300">
          <span className="text-gray-400">Type: </span>
          <span className="capitalize font-medium">{predictedIntent.type}</span>
        </div>

        {predictedIntent.topics.length > 0 && (
          <div className="text-sm text-gray-300">
            <span className="text-gray-400">Topics: </span>
            <span className="font-medium">
              {predictedIntent.topics.join(', ')}
            </span>
          </div>
        )}

        {predictedIntent.suggestedResponse && (
          <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300 italic">
            Suggested: "{predictedIntent.suggestedResponse}"
          </div>
        )}
      </div>
    </div>
  );
}
