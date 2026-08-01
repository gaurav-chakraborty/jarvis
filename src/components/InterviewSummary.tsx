import React, { useMemo } from 'react';
import { BarChart, TrendingUp, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { InterviewContext } from '../types/agent';

interface InterviewSummaryProps {
  context: InterviewContext;
  totalQuestions: number;
  correctAnswers: number;
  averageConfidence: number;
  performanceHistory: Array<{
    questionIndex: number;
    confidence: number;
    responseTime: number;
  }>;
  topTopics: string[];
  improvementAreas: string[];
  onRestart: () => void;
}

export const InterviewSummary = React.memo(({
  context,
  totalQuestions,
  correctAnswers,
  averageConfidence,
  performanceHistory,
  topTopics,
  improvementAreas,
  onRestart,
}: InterviewSummaryProps) => {
  const stats = useMemo(() => ({
    successRate: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    avgResponseTime: performanceHistory.length > 0
      ? Math.round(performanceHistory.reduce((sum, p) => sum + p.responseTime, 0) / performanceHistory.length)
      : 0,
    confidencePercentage: Math.round(averageConfidence * 100),
    trend: performanceHistory.length > 1
      ? performanceHistory[performanceHistory.length - 1].confidence - performanceHistory[0].confidence > 0
        ? 'improving'
        : 'declining'
      : 'stable',
  }), [totalQuestions, correctAnswers, averageConfidence, performanceHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Interview Complete!</h1>
          <p className="text-gray-400">
            {context.companyName} • {context.roleTitle}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Success Rate */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Success Rate</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-gray-500 mt-2">
              {correctAnswers} of {totalQuestions} questions answered well
            </p>
          </div>

          {/* Confidence Score */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Avg Confidence</span>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.confidencePercentage}%</div>
            <p className="text-xs text-gray-500 mt-2">Overall response confidence</p>
          </div>

          {/* Response Time */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Avg Response Time</span>
              <BarChart className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-gray-500 mt-2">Average time per response</p>
          </div>

          {/* Trend */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Performance</span>
              <TrendingUp className={`w-5 h-5 ${stats.trend === 'improving' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className="text-3xl font-bold capitalize">{stats.trend}</div>
            <p className="text-xs text-gray-500 mt-2">Trend across questions</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Topics */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-400" />
              Top Topics Discussed
            </h3>
            <div className="space-y-2">
              {topTopics.length > 0 ? (
                topTopics.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <span className="text-sm">{topic}</span>
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No topics tracked</p>
              )}
            </div>
          </div>

          {/* Improvement Areas */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Areas to Improve
            </h3>
            <div className="space-y-2">
              {improvementAreas.length > 0 ? (
                improvementAreas.map((area, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-gray-700 rounded">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span className="text-sm">{area}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No improvement areas identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Performance Timeline */}
        {performanceHistory.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Confidence Trend</h3>
            <div className="flex items-end gap-1 h-24">
              {performanceHistory.map((point, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${point.confidence * 100}%` }}
                  title={`Q${point.questionIndex}: ${Math.round(point.confidence * 100)}%`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Confidence level across questions</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onRestart}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Start Another Interview
          </button>
          <button
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            Download Report
          </button>
        </div>

        {/* Footer Tips */}
        <div className="mt-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <p className="text-sm font-medium text-gray-300 mb-2">💡 Pro Tips for Next Interview:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Review the topics you found challenging before your next interview</li>
            <li>• Practice keeping your response time under {stats.avgResponseTime}ms</li>
            <li>• Focus on building confidence in the identified improvement areas</li>
            <li>• Note your best-performing topics and expand on those themes</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

InterviewSummary.displayName = 'InterviewSummary';
