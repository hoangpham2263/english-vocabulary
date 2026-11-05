
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ACCENT_LANG, getAccent } from "@/lib/accent";

// The Web Speech API's recogniser. Not in TypeScript's DOM lib yet, and still
// prefixed in Chrome and Safari, so only the parts used here are typed. The
// browser does the recognition; nothing is recorded or sent to this app.
type RecognitionAlternative = { transcript: string; confidence: number };
type RecognitionResultList = ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal: boolean }>;
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: RecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribeNothing = () => () => {};

export function useRecognitionSupported() {
  return useSyncExternalStore(subscribeNothing, () => getConstructor() !== null, () => false);
}

export type RecognitionState =
  | { status: "idle" }
  | { status: "listening"; interim: string }
  | { status: "heard"; alternatives: string[] }
  | { status: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Trình duyệt chưa được cho phép dùng micro. Hãy bật quyền micro cho trang này.",
  "service-not-allowed": "Trình duyệt chưa được cho phép dùng micro. Hãy bật quyền micro cho trang này.",
  "no-speech": "Không nghe thấy gì. Bấm micro rồi đọc to hơn một chút.",
  "audio-capture": "Không tìm thấy micro.",
  network: "Nhận dạng giọng nói cần kết nối mạng.",
};

/** Longest a single attempt listens before it scores what it has. */
export const MAX_LISTEN_MS = 5000;

/**
 * One attempt at saying a word. Shows what it hears while you speak, stops by
 * itself as soon as `isDone` accepts an interim result or after MAX_LISTEN_MS,
 * and can be stopped by hand; stopping always scores what was heard so far.
 * Browsers wait a long silence before ending on their own, which for a single
 * word felt like the microphone never stopped.
 */
export function useSpeechRecognition(isDone?: (heard: string) => boolean, maxMs = MAX_LISTEN_MS) {
  const [state, setState] = useState<RecognitionState>({ status: "idle" });
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      recognition.current?.abort();
    },
    [],
  );

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const listen = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) return;
    recognition.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    const r = new Ctor();
    r.lang = ACCENT_LANG[getAccent()];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 5;

    let finalAlternatives: string[] = [];
    let interim = "";
    let failed = false;

    r.onresult = (event) => {
      const results = Array.from(event.results);
      const last = results[results.length - 1];
      if (!last) return;
      if (last.isFinal) {
        finalAlternatives = Array.from(last, (alt) => alt.transcript.trim()).filter(Boolean);
        r.stop();
        return;
      }
      interim = results.map((result) => result[0]?.transcript ?? "").join(" ").trim();
      setState({ status: "listening", interim });
      if (interim && isDone?.(interim)) r.stop();
    };
    r.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech" && interim) return;
      failed = true;
      setState({ status: "error", message: ERROR_MESSAGES[event.error] ?? "Không nhận dạng được. Thử lại nhé." });
    };
    r.onend = () => {
      if (timer.current) clearTimeout(timer.current);
      if (failed) return;
      const alternatives = finalAlternatives.length > 0 ? finalAlternatives : interim ? [interim] : [];
      setState(
        alternatives.length > 0
          ? { status: "heard", alternatives }
          : { status: "error", message: ERROR_MESSAGES["no-speech"] },
      );
    };

    recognition.current = r;
    setState({ status: "listening", interim: "" });
    r.start();
    timer.current = setTimeout(() => r.stop(), maxMs);
  }, [isDone, maxMs]);

  const reset = useCallback(() => {
    recognition.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, listen, stop, reset };
}
