import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { InterviewAgent } from '../agent/InterviewAgent';
import { InterviewContext } from '../types/agent';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AgentStatus } from './AgentStatus';
import { PredictionDisplay } from './PredictionDisplay';
import { StrategyPanel } from './StrategyPanel';
import { QuestionDisplay } from './QuestionDisplay';
import { AnswerPanel } from './AnswerPanel';
import { ThoughtsModal } from './ThoughtsModal';

interface InterviewInterfaceProps {
  interviewContext: InterviewContext;
}

export function InterviewInterface({
  interviewContext,
}: InterviewInterfaceProps) {
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [showThoughts, setShowThoughts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [finalQuestion, setFinalQuestion] = useState<string>('');

  const {
    transcript,
    finalTranscript,
    isListening,
    startListening,
    stopListening,
    isBrowserSupportsSpeechRecognition,
  } = useSpeechRecognition({
    onTranscript: useCallback((partial) => {
      if (agent) {
        const analysis = agent.analyzeInput(partial);
        if (analysis.predictedIntent.type !== 'unknown') {
          // Generate mock answer based on question type
          const mockAnswers: Record<string, string> = {
            technical: 'I would approach this by first understanding the requirements, breaking it down into components, and then designing a scalable solution. For example, I\'d consider the architecture, choose appropriate technologies, and implement with optimization in mind.',
            behavioral: 'In my previous role, I faced a similar situation. Here\'s how I handled it: First, I analyzed the problem. Then, I collaborated with my team to develop a solution. The result was a 30% improvement in our process.',
            experience: 'I have significant experience with this. Throughout my career, I\'ve worked with various technologies and teams. This has taught me the importance of continuous learning and staying current with industry trends.',
            motivation: 'I\'m interested in this opportunity because it aligns with my career goals and the work you\'re doing is fascinating. I believe my background in building scalable systems would be valuable here.',
            personal: 'I value technical excellence and continuous improvement. I think that\'s important because it drives innovation and helps build better products.',
            unknown: 'That\'s a great question. Let me think about that.',
          };

          const answer = mockAnswers[analysis.predictedIntent.type] || mockAnswers.unknown;
          setCurrentAnswer(answer);
        }
      }
    }, [agent]),
    onFinalTranscript: useCallback((final) => {
      if (agent) {
        setFinalQuestion(prev => prev + final + ' ');
        agent.storeConversationTurn(
          final,
          currentAnswer || '',
          ['follow-up']
        );
      }
    }, [agent, currentAnswer]),
  });

  // Initialize agent
  useEffect(() => {
    const newAgent = new InterviewAgent(interviewContext);
    setAgent(newAgent);
  }, [interviewContext]);

  const handleCopyAnswer = useCallback(() => {
    if (currentAnswer) {
      navigator.clipboard.writeText(currentAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentAnswer]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setFinalQuestion('');
      setCurrentAnswer(null);
      startListening();
    }
  };

  if (!agent || !isBrowserSupportsSpeechRecognition) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-lg mb-2">
            {isBrowserSupportsSpeechRecognition
              ? 'Initializing...'
              : 'Speech Recognition not supported in this browser'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-2xl font-bold">
            Interview: <span className="text-blue-400">{interviewContext.roleTitle}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {interviewContext.companyName} • Agentic Mode Active
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Agent Status */}
          <AgentStatus
            state={agent.getState()}
            confidence={agent.getConfidence()}
            onShowThoughts={() => setShowThoughts(true)}
          />

          {/* Prediction Display */}
          <PredictionDisplay predictedIntent={agent.getPredictedIntent()} />

          {/* Strategy Panel */}
          <StrategyPanel strategy={agent.getCurrentStrategy()} />

          {/* Question Display */}
          <QuestionDisplay
            question={finalQuestion || transcript}
            isPartial={!finalQuestion && !!transcript}
          />

          {/* Answer Panel */}
          <AnswerPanel
            answer={currentAnswer}
            isGenerating={!finalQuestion && !!transcript}
            onCopy={handleCopyAnswer}
            copied={copied}
          />
        </div>

        {/* Control Bar */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {isListening ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">●</span> Recording...
              </span>
            ) : (
              'Ready'
            )}
          </div>

          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              isListening
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Interview
              </>
            )}
          </button>

          <div className="text-sm text-gray-400">
            {finalQuestion ? `${finalQuestion.split(' ').length} words` : '-'}
          </div>
        </div>
      </div>

      {/* Thoughts Modal */}
      <ThoughtsModal agent={agent} onClose={() => setShowThoughts(false)} />
      {showThoughts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowThoughts(false)}
        />
      )}
    </>
  );
}
