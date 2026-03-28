import React from 'react';
import { X } from 'lucide-react';
import { InterviewAgent } from '../agent/InterviewAgent';

interface ThoughtsModalProps {
  agent: InterviewAgent | null;
  onClose: () => void;
}

export function ThoughtsModal({ agent, onClose }: ThoughtsModalProps) {
  if (!agent) return null;

  const strategy = agent.getCurrentStrategy();
  const memory = agent.getMemorySummary();
  const predictedNext = agent.predictNextQuestion();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-96 max-h-96 overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-900">
          <h3 className="text-lg font-semibold text-white">Agent Thoughts</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current Strategy */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Strategy
            </div>
            <div className="text-sm text-gray-300 capitalize">
              {strategy.type.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Top Topics */}
          {memory.topTopics.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Key Topics
              </div>
              <div className="flex flex-wrap gap-1">
                {memory.topTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Predicted Next Question */}
          {predictedNext && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Predicted Next
              </div>
              <div className="text-sm text-gray-300 italic">
                "{predictedNext}"
              </div>
            </div>
          )}

          {/* Recent Topics */}
          {memory.recentTurns.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Recent Topics Discussed
              </div>
              <div className="space-y-1">
                {memory.recentTurns.map((turn, i) => (
                  <div key={i} className="text-xs text-gray-400">
                    {turn.topics.join(', ') || 'General'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
