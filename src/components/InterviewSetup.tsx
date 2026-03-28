import React, { useState } from 'react';
import { Zap, Brain } from 'lucide-react';
import { InterviewContext } from '../types/agent';

interface InterviewSetupProps {
  onStart: (context: InterviewContext) => void;
}

export function InterviewSetup({ onStart }: InterviewSetupProps) {
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [interviewers, setInterviewers] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const interviewerNames = interviewers
      .split(',')
      .map(name => name.trim())
      .filter(name => name);

    if (!companyName || !roleTitle || interviewerNames.length === 0) {
      alert('Please fill in all fields');
      return;
    }

    onStart({
      companyName,
      roleTitle,
      interviewerNames,
      currentPhase: 'opening',
      totalQuestionsAsked: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold">Agentic Interview Assistant</h1>
          </div>
          <p className="text-xl text-gray-400">
            Real-time AI-powered interview preparation with autonomous decision-making
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          {[
            {
              icon: '🎯',
              title: 'Intent Prediction',
              desc: 'Predicts questions before they finish',
            },
            {
              icon: '🧠',
              title: 'Adaptive Strategy',
              desc: 'Adjusts approach in real-time',
            },
            {
              icon: '⚡',
              title: 'Autonomous Actions',
              desc: 'Auto-generates answers & suggestions',
            },
            {
              icon: '💾',
              title: 'Memory System',
              desc: 'Learns & improves continuously',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <div className="font-semibold text-sm mb-1">{feature.title}</div>
              <div className="text-xs text-gray-400">{feature.desc}</div>
            </div>
          ))}
        </div>

        {/* Setup Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-lg border border-gray-700 p-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Interview Configuration
          </h2>

          <div className="space-y-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g., Microsoft, Google, Meta"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">
                The company you're interviewing with
              </p>
            </div>

            {/* Role Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer, Product Manager"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">
                The position you're interviewing for
              </p>
            </div>

            {/* Interviewer Names */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Interviewer Names
              </label>
              <input
                type="text"
                value={interviewers}
                onChange={e => setInterviewers(e.target.value)}
                placeholder="e.g., John Smith, Sarah Johnson, Mike Chen"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated list of interviewer names (if known)
              </p>
            </div>
          </div>

          {/* Capabilities List */}
          <div className="mt-8 p-4 bg-gray-700 rounded border border-gray-600">
            <p className="text-sm font-medium text-gray-300 mb-3">
              Agent capabilities:
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✓ Real-time question prediction</li>
              <li>✓ Automatic answer generation</li>
              <li>✓ Dynamic strategy adaptation</li>
              <li>✓ Interviewer profiling</li>
              <li>✓ Talking points suggestion</li>
              <li>✓ One-click answer copying</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-5 h-5" />
            Start Interview Assistant
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Powered by advanced AI agents with autonomous decision-making
          </p>
        </div>
      </div>
    </div>
  );
}
