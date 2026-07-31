import { useState } from 'react';
import { InterviewContext } from './types/agent';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewInterface } from './components/InterviewInterface';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [interviewContext, setInterviewContext] =
    useState<InterviewContext | null>(null);

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
