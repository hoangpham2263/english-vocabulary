
import { Volume2Icon } from "lucide-react";
import { useRef } from "react";
import { playSound } from "@/components/sound-buttons";
import { speak } from "@/components/speak-buttons";
import { useAccent } from "@/components/accent-provider";
import { soundAudioUrl } from "@/lib/ipa-audio";
import { cn } from "@/lib/utils";

/**
 * A transcription you can press: it says the word it transcribes, in the
 * learner's accent. Browser speech cannot read IPA itself, so it is always the
 * word that is spoken, never the symbols.
 */
export function IpaButton({ ipa, word, className }: { ipa: string; word: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(word);
      }}
      title={`Nghe "${word}"`}
      aria-label={`Nghe ${word}, phiên âm ${ipa}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-card px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      /{ipa}/
      <Volume2Icon className="size-[0.8em] opacity-70" />
    </button>
  );
}

/**
 * The example line of an IPA card: each example word with its transcription,
 * each one pressable on its own.
 */
export function ExampleIpaList({ example, transcriptions }: { example: string; transcriptions: string }) {
  const words = example.split(",").map((w) => w.trim()).filter(Boolean);
  const ipas = transcriptions.split("·").map((t) => t.trim().replace(/^\/|\/$/g, ""));
  return (
    <div className="flex flex-wrap gap-1.5">
      {words.map((word, i) => (
        <span key={word} className="inline-flex items-center gap-1.5 text-sm">
          <b>{word}</b>
          {ipas[i] ? <IpaButton ipa={ipas[i]} word={word} className="text-sm" /> : null}
        </span>
      ))}
    </div>
  );
}

/** The big symbol on an IPA card: pressing it plays that sound's recording. */
export function SoundSymbol({ front, className }: { front: string; className?: string }) {
  const url = soundAudioUrl(front, useAccent());
  const audio = useRef<HTMLAudioElement>(null);
  if (!url) return <p className={className}>{front}</p>;
  return (
    <>
      <audio ref={audio} src={url} preload="auto" />
      <button
        type="button"
        onClick={() => playSound(audio.current)}
        title={`Nghe âm ${front}`}
        aria-label={`Nghe âm ${front}`}
        className={cn("rounded-lg border bg-card px-4 transition-colors hover:bg-accent", className)}
      >
        {front}
      </button>
    </>
  );
}
