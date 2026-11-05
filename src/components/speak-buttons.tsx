
import { SnailIcon, Volume2Icon } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ACCENT_LANG, PREFERRED_VOICES, getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

// Browser speech in the learner's chosen accent (US or UK).
export const NORMAL_RATE = 0.9;
export const SLOW_RATE = 0.55;

function subscribeVoices(onChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

function getSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Optional hooks for reading along: the start of each spoken word, and the end. */
export type SpeakEvents = { onWord?: (charIndex: number) => void; onEnd?: () => void };

export function speak(text: string, rate = NORMAL_RATE, events: SpeakEvents = {}) {
  if (!getSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const accent = getAccent();
  const lang = ACCENT_LANG[accent];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voices = synth.getVoices();
  // Prefer a natural voice of the chosen accent; browsers otherwise fall back
  // to the system language, which here is often Vietnamese.
  const voice =
    voices.find((v) => v.lang.replace("_", "-") === lang && PREFERRED_VOICES[accent].test(v.name)) ??
    voices.find((v) => v.lang.replace("_", "-") === lang) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (voice) utterance.voice = voice;
  if (events.onWord) {
    const onWord = events.onWord;
    utterance.onboundary = (event) => {
      if (event.name === "word") onWord(event.charIndex);
    };
  }
  if (events.onEnd) utterance.onend = utterance.onerror = events.onEnd;
  synth.speak(utterance);
}

export function useSpeechSupported() {
  return useSyncExternalStore(subscribeVoices, getSupported, () => false);
}

/**
 * The one listen button style used everywhere: outlined, same height and text
 * size, so a row of them (normal, slow, in-word) reads as one control.
 */
export function ListenButton({
  icon: Icon,
  children,
  small = false,
  ...props
}: React.ComponentProps<"button"> & { icon: React.ComponentType<{ className?: string }>; small?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("gap-1.5 font-semibold", small ? "h-7 rounded-md px-2.5 text-xs" : "h-8 px-3 text-sm")}
      {...props}
    >
      <Icon className={small ? "size-3.5" : "size-4"} />
      {children}
    </Button>
  );
}

export function SpeakButtons({
  text,
  size = "sm",
  className,
  label = "Nghe",
}: {
  text: string;
  size?: "sm" | "xs";
  className?: string;
  label?: string;
}) {
  const supported = useSpeechSupported();
  const play = useCallback((rate: number) => speak(text, rate), [text]);
  const small = size === "xs";

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <ListenButton
        icon={Volume2Icon}
        small={small}
        disabled={!supported}
        title={supported ? `${label} (tốc độ thường)` : "Trình duyệt không hỗ trợ đọc"}
        onClick={(event) => {
          event.stopPropagation();
          play(NORMAL_RATE);
        }}
      >
        {label}
      </ListenButton>
      <ListenButton
        icon={SnailIcon}
        small={small}
        disabled={!supported}
        title="Đọc chậm"
        onClick={(event) => {
          event.stopPropagation();
          play(SLOW_RATE);
        }}
      >
        Chậm
      </ListenButton>
    </div>
  );
}
