import { useState } from 'react';
import { InterviewContext } from './types/agent';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewInterface } from './components/InterviewInterface';

function App() {
  const [interviewContext, setInterviewContext] =
    useState<InterviewContext | null>(null);

  if (!interviewContext) {
    return (
      <InterviewSetup
        onStart={(context) => setInterviewContext(context)}
      />
    );
  }

  return <InterviewInterface interviewContext={interviewContext} />;
}

export default App;
