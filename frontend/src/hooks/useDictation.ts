import { useCallback, useEffect, useRef, useState } from "react";

/* Typage minimal de l'API Web Speech (non incluse dans les types DOM standard). */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictée vocale via l'API du navigateur (Web Speech API).
 * `onText` reçoit chaque segment final reconnu (à concaténer aux notes).
 * Note : selon le navigateur (ex. Chrome), l'audio est transmis à un service
 * tiers pour la reconnaissance — à signaler côté UI (RGPD).
 */
export function useDictation(onText: (segment: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const supported = typeof window !== "undefined" && getCtor() !== null;

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onTextRef.current(r[0].transcript.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      // Le moteur s'arrête après un silence : on relance tant que l'utilisateur
      // n'a pas explicitement stoppé.
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  // Nettoyage au démontage.
  useEffect(() => {
    return () => {
      wantRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  return { supported, listening, start, stop };
}
