import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Sun, Moon } from 'lucide-react';
import { InterviewAgent } from '../agent/InterviewAgent';
import { InterviewContext } from '../types/agent';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTheme } from '../hooks/useTheme';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/secureLogger';
import { ErrorBoundary } from './ErrorBoundary';
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
  const debouncedAnalyzeRef = useRef<((partial: string) => void) | null>(null);
  const { effectiveTheme, toggleTheme } = useTheme();

  const analyzeInput = useCallback((partial: string) => {
    if (agent) {
      try {
        const analysis = agent.analyzeInput(partial);
        if (analysis.predictedIntent.type !== 'unknown' && analysis.confidence > 0.7) {
          agent.generateAnswer(partial).then(answer => {
            setCurrentAnswer(answer);
          }).catch(err => {
            logger.error('Failed to generate answer', err);
            setCurrentAnswer(null);
          });
        }
      } catch (error) {
        logger.error('Input analysis failed', error as Error);
      }
    }
  }, [agent]);

  useEffect(() => {
    debouncedAnalyzeRef.current = debounce(analyzeInput, 300);
  }, [analyzeInput]);

  const {
    transcript,
    finalTranscript,
    isListening,
    startListening,
    stopListening,
    isBrowserSupportsSpeechRecognition,
  } = useSpeechRecognition({
    onTranscript: useCallback((partial) => {
      if (debouncedAnalyzeRef.current) {
        debouncedAnalyzeRef.current(partial);
      }
    }, []),
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
    }
  }, [currentAnswer]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

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
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Interview: <span className="text-blue-400">{interviewContext.roleTitle}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {interviewContext.companyName} • Agentic Mode Active
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Current: ${effectiveTheme} mode`}
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-400" />
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Agent Status */}
          <ErrorBoundary level="component">
            <AgentStatus
              state={agent.getState()}
              confidence={agent.getConfidence()}
              onShowThoughts={() => setShowThoughts(true)}
            />
          </ErrorBoundary>

          {/* Prediction Display */}
          <ErrorBoundary level="component">
            <PredictionDisplay predictedIntent={agent.getPredictedIntent()} />
          </ErrorBoundary>

          {/* Strategy Panel */}
          <ErrorBoundary level="component">
            <StrategyPanel strategy={agent.getCurrentStrategy()} />
          </ErrorBoundary>

          {/* Question Display */}
          <ErrorBoundary level="component">
            <QuestionDisplay
              question={finalQuestion || transcript}
              isPartial={!finalQuestion && !!transcript}
            />
          </ErrorBoundary>

          {/* Answer Panel */}
          <ErrorBoundary level="component">
            <AnswerPanel
              answer={currentAnswer}
              isGenerating={!finalQuestion && !!transcript}
              onCopy={handleCopyAnswer}
              copied={copied}
            />
          </ErrorBoundary>
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
            aria-label={isListening ? 'Stop listening to interview' : 'Start listening to interview'}
            aria-pressed={isListening}
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
