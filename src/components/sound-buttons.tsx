
import { AudioLinesIcon, SnailIcon, Volume2Icon } from "lucide-react";
import { useRef } from "react";
import { ListenButton, SpeakButtons, speak } from "@/components/speak-buttons";
import { useAccent } from "@/components/accent-provider";
import { soundAudioUrl } from "@/lib/ipa-audio";
import { keyWord } from "@/lib/practice";
import type { StudyCard } from "@/lib/study";

// Every recording started, so a page change can silence them: an <audio> that
// leaves the page, or one never in it, keeps playing otherwise.
const playing = new Set<HTMLAudioElement>();

/** Silences browser speech and every recording; called on each page change. */
export function stopAllSound() {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  for (const audio of playing) audio.pause();
  playing.clear();
}

/** Plays a sound card's own recording; slow keeps the pitch. */
export function playSound(audio: HTMLAudioElement | null, rate = 1) {
  if (!audio) return;
  stopAllSound();
  playing.add(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.playbackRate = rate;
  audio.preservesPitch = true;
  void audio.play().catch(() => {});
}

/**
 * Listen controls for an IPA card: the isolated sound when a recording exists,
 * and the sound inside its key word through browser speech.
 */
export function SoundButtons({ card }: { card: Pick<StudyCard, "front" | "type" | "example"> }) {
  const url = soundAudioUrl(card.front, useAccent());
  const word = keyWord(card);
  const audio = useRef<HTMLAudioElement>(null);

  if (!url) {
    return (
      <div className="flex flex-col items-center gap-1">
        {word && <SpeakButtons text={word} />}
        <p className="text-xs text-muted-foreground">
          Âm này chưa có file ghi âm riêng, nghe qua từ <b className="text-foreground">{word}</b>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <audio ref={audio} src={url} preload="auto" />
      <ListenButton icon={AudioLinesIcon} onClick={() => playSound(audio.current)} title="Nghe âm đứng riêng">
        Nghe âm
      </ListenButton>
      <ListenButton icon={SnailIcon} onClick={() => playSound(audio.current, 0.6)} title="Nghe âm chậm">
        Chậm
      </ListenButton>
      {word && (
        <ListenButton icon={Volume2Icon} onClick={() => speak(word)} title={`Nghe âm này trong từ ${word}`}>
          Trong từ &quot;{word}&quot;
        </ListenButton>
      )}
    </div>
  );
}
