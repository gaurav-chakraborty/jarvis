import React, { useState, useMemo, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp, X } from 'lucide-react';
import { debugStats as debugStatsStore } from '../utils/debugStats';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface ApiCall {
  method: string;
  url: string;
  status?: number;
  duration: number;
  timestamp: number;
}

interface DebugStats {
  metrics: PerformanceMetric[];
  apiCalls: ApiCall[];
  cacheHits: number;
  cacheMisses: number;
  logCount: Record<string, number>;
}

const POLL_INTERVAL_MS = 1000;

export const DebugToolbar = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'api' | 'cache' | 'logs'>('performance');
  const [stats, setStats] = useState<DebugStats>(() => debugStatsStore.getStats());

  useEffect(() => {
    if (!isOpen) return;

    setStats(debugStatsStore.getStats());
    const intervalId = setInterval(() => {
      setStats(debugStatsStore.getStats());
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isOpen]);

  const performanceStats = useMemo(() => {
    if (!stats?.metrics || stats.metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const durations = stats.metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { avg: Math.round(avg), min, max, count: stats.metrics.length };
  }, [stats]);

  const cacheStats = useMemo(() => {
    const total = stats.cacheHits + stats.cacheMisses;
    const hitRate = total > 0 ? ((stats.cacheHits / total) * 100).toFixed(1) : 0;
    return { total, hitRate };
  }, [stats]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
        title="Debug Toolbar"
      >
        <Settings className="w-4 h-4" />
        Debug {!isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-700">
            <h3 className="text-sm font-bold text-white">Performance Debug</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-900">
            {(['performance', 'api', 'cache', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-gray-800 max-h-64 overflow-y-auto">
            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="p-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Avg Time</div>
                    <div className="text-sm font-bold text-blue-400">{performanceStats.avg}ms</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Min/Max</div>
                    <div className="text-sm font-bold text-blue-400">
                      {performanceStats.min}ms / {performanceStats.max}ms
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Operations</div>
                    <div className="text-sm font-bold text-blue-400">{performanceStats.count}</div>
                  </div>
                </div>

                {stats.metrics.length > 0 && (
                  <div className="bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
                    <div className="text-gray-400 mb-1 font-medium">Recent Metrics:</div>
                    {stats.metrics.slice(-5).map((m, i) => (
                      <div key={i} className="flex justify-between text-gray-300">
                        <span className="truncate">{m.name}</span>
                        <span className="text-blue-300">{m.duration}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* API Tab */}
            {activeTab === 'api' && (
              <div className="p-3 space-y-2 text-xs">
                <div className="text-gray-400 font-medium mb-2">
                  Total API Calls: <span className="text-blue-400">{stats.apiCalls.length}</span>
                </div>

                {stats.apiCalls.length > 0 ? (
                  <div className="bg-gray-700 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                    {stats.apiCalls.slice(-10).map((call, i) => (
                      <div key={i} className="flex items-center justify-between text-gray-300">
                        <span className="flex-1">
                          <span className={`font-medium ${
                            call.status && call.status < 400 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {call.method}
                          </span>
                          {' '}
                          <span className="text-gray-400 truncate">{call.url}</span>
                        </span>
                        <span className="ml-2 text-blue-300 flex-shrink-0">{call.duration}ms</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400">No API calls yet</div>
                )}
              </div>
            )}

            {/* Cache Tab */}
            {activeTab === 'cache' && (
              <div className="p-3 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Hits</div>
                    <div className="text-sm font-bold text-green-400">{stats.cacheHits}</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Misses</div>
                    <div className="text-sm font-bold text-red-400">{stats.cacheMisses}</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-400">Hit Rate</div>
                    <div className="text-sm font-bold text-blue-400">{cacheStats.hitRate}%</div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400 mb-1 font-medium">Cache Performance:</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, parseFloat(cacheStats.hitRate.toString())))}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">{cacheStats.total} total</span>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="p-3 space-y-2 text-xs">
                {Object.entries(stats.logCount).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(stats.logCount).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between bg-gray-700 rounded p-2">
                        <span className={`font-medium ${
                          level === 'ERROR' ? 'text-red-400' :
                          level === 'WARN' ? 'text-yellow-400' :
                          level === 'INFO' ? 'text-blue-400' :
                          'text-gray-400'
                        }`}>
                          {level}
                        </span>
                        <span className="text-gray-300">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400">No logs yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

DebugToolbar.displayName = 'DebugToolbar';
