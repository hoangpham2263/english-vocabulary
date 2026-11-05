
import { IpaButton } from "@/components/ipa-button";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CardFront } from "@/components/practice/card-face";
import { useAccent } from "@/components/accent-provider";
import type { DrillProps } from "@/components/practice/practice-session";
import { playSound } from "@/components/sound-buttons";
import { SpeakButtons, speak } from "@/components/speak-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { spokenText, type QuizQuestion } from "@/lib/practice";
import { ipaFor } from "@/lib/accent";
import { soundAudioUrl } from "@/lib/ipa-audio";
import { cn } from "@/lib/utils";

export function QuizDrill({ card, onResult, question }: DrillProps & { question: QuizQuestion }) {
  const accent = useAccent();
  const ipa = ipaFor(card, accent);
  // About half the questions go the other way: read the meaning, pick the word.
  const { reverse, options } = question;
  const correct = reverse ? card.front : card.back;
  const [picked, setPicked] = useState<string | null>(null);
  const isRight = picked === correct;

  function pick(option: string) {
    if (picked !== null) return;
    setPicked(option);
    // Hear the answer as soon as it is chosen, right or wrong: the word in the
    // chosen accent, or for an IPA card its own recording.
    const recording = card.type === "sound" ? soundAudioUrl(card.front, accent) : null;
    if (recording) {
      playSound(new Audio(recording));
    } else {
      speak(spokenText(card));
    }
  }

  useEffect(() => {
    if (picked === null || !isRight) return;
    // Long enough for the word to finish before the next question.
    const timer = setTimeout(() => onResult(true), 1400);
    return () => clearTimeout(timer);
  }, [picked, isRight, onResult]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const n = Number(event.key);
      if (picked === null && n >= 1 && n <= options.length) pick(options[n - 1]);
      else if (picked !== null && !isRight && event.key === "Enter") onResult(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="px-5 py-5 sm:px-8">
          {reverse ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Từ nào có nghĩa là</p>
              <p className="text-2xl font-bold text-primary-edge sm:text-3xl">{card.back}</p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-semibold text-muted-foreground">Chọn nghĩa đúng</p>
              <CardFront card={card} />
            </>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option, i) => {
          const state =
            picked === null ? "idle" : option === correct ? "right" : option === picked ? "wrong" : "dim";
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(option)}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-base transition-colors",
                state === "idle" && "hover:border-primary hover:bg-accent",
                state === "right" && "border-rate-good bg-rate-good text-white",
                state === "wrong" && "border-rate-again bg-rate-again text-white",
                state === "dim" && "opacity-50",
              )}
            >
              <kbd
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md border text-xs",
                  (state === "right" || state === "wrong") && "border-white/60",
                )}
              >
                {i + 1}
              </kbd>
              <span className={cn(reverse && "font-semibold")}>{option}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && !isRight && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rate-again/40 bg-card p-4 text-center">
          <p className="text-sm">
            <b>{card.front}</b>
            {ipa && <> <IpaButton ipa={ipa} word={card.front} /></>}: {card.back}
          </p>
          {spokenText(card) && <SpeakButtons text={spokenText(card)} size="xs" />}
          <Button onClick={() => onResult(false)}>
            Tiếp <ArrowRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
