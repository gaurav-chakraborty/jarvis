import { useState, useEffect } from 'react';
import { InterviewContext } from './types/agent';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewInterface } from './components/InterviewInterface';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';

function App() {
  const [interviewContext, setInterviewContext] =
    useState<InterviewContext | null>(null);

  useTheme();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  if (!interviewContext) {
    return (
      <ErrorBoundary>
        <InterviewSetup
          onStart={(context) => setInterviewContext(context)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <InterviewInterface interviewContext={interviewContext} />
    </ErrorBoundary>
  );
}

export default App;
