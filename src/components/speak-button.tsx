
import { AudioLinesIcon, Volume2Icon } from "lucide-react";
import { useRef } from "react";
import { playSound } from "@/components/sound-buttons";
import { speak, useSpeechSupported } from "@/components/speak-buttons";
import { Button } from "@/components/ui/button";
import { useAccent } from "@/components/accent-provider";
import { soundAudioUrl } from "@/lib/ipa-audio";

/** Compact single button for lists. */
export function SpeakButton({ text }: { text: string }) {
  const supported = useSpeechSupported();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      disabled={!supported}
      title={`Nghe "${text}"`}
      aria-label={`Nghe ${text}`}
      onClick={() => speak(text)}
    >
      <Volume2Icon className="size-4" />
    </Button>
  );
}

/**
 * List button for an IPA card: plays the sound's own recording, or, for the
 * few sounds without one, speaks its key word.
 */
export function SoundListButton({ front, keyWord }: { front: string; keyWord: string }) {
  const url = soundAudioUrl(front, useAccent());
  const audio = useRef<HTMLAudioElement>(null);
  if (!url) return <SpeakButton text={keyWord} />;
  return (
    <>
      <audio ref={audio} src={url} preload="none" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        title={`Nghe âm ${front}`}
        aria-label={`Nghe âm ${front}`}
        onClick={() => playSound(audio.current)}
      >
        <AudioLinesIcon className="size-4" />
      </Button>
    </>
  );
}
