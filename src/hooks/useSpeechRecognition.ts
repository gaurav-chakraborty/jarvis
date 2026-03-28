import { useEffect, useState, useRef } from 'react';

interface SpeechRecognitionOptions {
  onTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setFinalTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          setFinalTranscript(prev => prev + transcriptSegment + ' ');
          if (options.onFinalTranscript) {
            options.onFinalTranscript(transcriptSegment);
          }
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      setTranscript(interimTranscript);
      if (options.onTranscript) {
        options.onTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      if (options.onError) {
        options.onError(errorMessage);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      recognition.stop();
    };
  }, [options]);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setFinalTranscript('');
  };

  return {
    transcript,
    finalTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isBrowserSupportsSpeechRecognition:
      !!(window as any).SpeechRecognition ||
      !!(window as any).webkitSpeechRecognition,
  };
}
