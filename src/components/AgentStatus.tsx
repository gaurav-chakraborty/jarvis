import React from 'react';
import { Brain, Zap, Ear } from 'lucide-react';
import { AgentState } from '../types/agent';

interface AgentStatusProps {
  state: AgentState;
  confidence: number;
  onShowThoughts?: () => void;
}

export function AgentStatus({
  state,
  confidence,
  onShowThoughts,
}: AgentStatusProps) {
  const getStateIcon = () => {
    switch (state) {
      case 'listening':
        return <Ear className="w-4 h-4" />;
      case 'thinking':
        return <Brain className="w-4 h-4 animate-spin" />;
      case 'predicting':
        return <Zap className="w-4 h-4 animate-pulse" />;
      case 'executing':
        return <Zap className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return 'text-green-500';
      case 'thinking':
        return 'text-yellow-500';
      case 'predicting':
        return 'text-orange-500';
      case 'executing':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={`${getStateColor()}`}>{getStateIcon()}</div>

        <div className="text-sm">
          <div className="font-medium text-white capitalize">{state}</div>
          <div className="text-xs text-gray-400">
            {Math.round(confidence * 100)}% confident
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Confidence bars */}
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`w-2 h-6 rounded-full ${
                confidence > i * 0.2
                  ? 'bg-green-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onShowThoughts}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors"
          title="View agent thoughts"
        >
          <Brain className="w-4 h-4 text-purple-400" />
        </button>
      </div>
    </div>
  );
}
