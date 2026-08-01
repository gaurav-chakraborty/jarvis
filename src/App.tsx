import { useState, useEffect } from 'react';
import { InterviewContext } from './types/agent';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewInterface } from './components/InterviewInterface';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DebugToolbar } from './components/DebugToolbar';
import { useTheme } from './hooks/useTheme';
import { setupApiInterceptor } from './utils/apiInterceptor';

function App() {
  const [interviewContext, setInterviewContext] =
    useState<InterviewContext | null>(null);
  const [showDebugToolbar, setShowDebugToolbar] = useState(
    process.env.NODE_ENV === 'development'
  );

  useTheme();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';

    if (process.env.NODE_ENV === 'development') {
      setupApiInterceptor({ enableLogging: true, enableMetrics: true });

      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          setShowDebugToolbar(prev => !prev);
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
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
      {showDebugToolbar && <DebugToolbar />}
    </ErrorBoundary>
  );
}

export default App;
