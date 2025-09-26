import { useState, useEffect, useRef } from 'react';

export const useVoiceSearch = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interim, setInterim] = useState<string>('');
  const recogRef = useRef<any>(null);
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      if (recogRef.current) {
        try { recogRef.current.stop(); } catch (e) {}
        try { recogRef.current.abort && recogRef.current.abort(); } catch (e) {}
        recogRef.current = null;
      }
    };
  }, []);

  const start = (onResult: (text: string) => void, onInterim?: (text: string) => void) => {
    const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
    if (!SR) {
      console.warn('Voice recognition not available in this environment');
      setSupported(false);
      return;
    }
    setSupported(true);
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      let final = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (final) { setTranscript(final); onResult(final); }
      setInterim(interimText);
      if (onInterim) onInterim(interimText);
    };
    r.onerror = (ev: any) => { console.warn('Speech recognition error', ev); setListening(false); };
    r.onend = () => { setListening(false); recogRef.current = null; };
    recogRef.current = r;
    setListening(true);
    try { r.start(); } catch (e) { console.warn('start failed', e); }
  };

  const stop = () => {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch (e) {}
      recogRef.current = null;
    }
    setListening(false);
  };

  const cancel = () => {
    if (recogRef.current) {
      try { recogRef.current.abort(); } catch (e) {}
      recogRef.current = null;
    }
    setListening(false);
    setInterim('');
  };

  return { listening, start, stop, cancel, transcript, interim, supported };
};

export default useVoiceSearch;
