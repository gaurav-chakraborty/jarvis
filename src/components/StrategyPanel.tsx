import React from 'react';
import { Zap, Target } from 'lucide-react';
import { Strategy } from '../types/agent';

interface StrategyPanelProps {
  strategy: Strategy | null;
}

export function StrategyPanel({ strategy }: StrategyPanelProps) {
  if (!strategy) return null;

  return (
    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-400">Current Strategy</span>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-white capitalize">
          {strategy.type.replace(/_/g, ' ')}
        </div>

        {strategy.tacticalAdjustments.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-400">Adjustments: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {strategy.tacticalAdjustments.map((adj, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-purple-900 text-purple-200 rounded text-xs"
                >
                  {adj}
                </span>
              ))}
            </div>
          </div>
        )}

        {strategy.talkingPoints.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-400 block mb-1">Talking Points:</span>
            <div className="space-y-0.5">
              {strategy.talkingPoints.map((point, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-gray-300"
                >
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
