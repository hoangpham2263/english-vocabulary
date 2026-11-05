
import { IpaButton } from "@/components/ipa-button";
import { ArrowRightIcon, EyeIcon, LightbulbIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccent } from "@/components/accent-provider";
import type { DrillProps } from "@/components/practice/practice-session";
import { SpeakButtons, speak, SLOW_RATE } from "@/components/speak-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  blankOut,
  closestMeaning,
  hintFrom,
  isCorrectMeaning,
  isExactMeaning,
  isCorrectSpelling,
  markAnswer,
  slotAnswer,
  type CharMark,
} from "@/lib/practice";
import { ipaFor } from "@/lib/accent";
import { clozeWord, withGap } from "@/lib/sentence";
import { ReadableSentence } from "@/components/practice/readable-sentence";
import { cn } from "@/lib/utils";

/**
 * "spell": read the meaning and the example with the word hidden, type the word.
 * "translate": read and hear the English word, type its Vietnamese meaning.
 * "listen": hear the word only, type it (dictation).
 *
 * A wrong answer is never revealed: the letters are marked one by one and the
 * learner fixes them. Only "Gợi ý" or "Xem đáp án", pressed by the learner,
 * gives anything away. The card counts as known only when right first time.
 */
export function TypeDrill({
  card,
  onResult,
  variant,
}: DrillProps & { variant: "spell" | "translate" | "listen" | "cloze" }) {
  const vietnamese = variant === "translate";
  // The word to type: the card's word, or the gap of a sentence card.
  const gap = variant === "cloze" ? clozeWord(card.front) : null;
  const word = gap ? gap.word : card.front;
  const ipa = ipaFor(card, useAccent());
  const [value, setValue] = useState("");
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const done = solved || revealed;

  // What the typed letters are measured against: the word, or the sense of the meaning closest to the answer.
  const target = vietnamese ? closestMeaning(value, card.back) : word;
  // Slots for every letter from the start; after a wrong check, each letter is marked.
  const marks = done ? null : missed && value.trim() ? markAnswer(value, target, vietnamese) : slotAnswer(value, target);

  // Dictation starts by saying the word once.
  useEffect(() => {
    if (variant === "listen") speak(card.front);
  }, [variant, card.front]);

  useEffect(() => {
    if (!solved) return;
    const timer = setTimeout(() => onResult(!missed), 1200);
    return () => clearTimeout(timer);
  }, [solved, missed, onResult]);

  function solve() {
    setSolved(true);
    speak(card.front);
  }

  // A right answer is accepted as soon as it is typed, without Enter. Only the
  // exact answer counts here; the typo-tolerant meaning check waits for Enter.
  function type(next: string) {
    setValue(next);
    if (done) return;
    if (vietnamese ? isExactMeaning(next, card.back) : isCorrectSpelling(next, word)) solve();
  }

  function check() {
    if (revealed) return onResult(false);
    if (solved || !value.trim()) return;
    if (vietnamese ? isCorrectMeaning(value, card.back) : isCorrectSpelling(value, word)) {
      solve();
    } else {
      setMissed(true);
      input.current?.focus();
    }
  }

  function hint() {
    setMissed(true);
    type(hintFrom(value, target, vietnamese));
    input.current?.focus();
  }

  function reveal() {
    setMissed(true);
    setRevealed(true);
    speak(card.front);
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="space-y-4 px-5 py-6 sm:px-8">
          {vietnamese ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Viết nghĩa tiếng Việt của</p>
              <p className="text-4xl font-bold tracking-tight break-words">{card.front}</p>
              {ipa && <IpaButton ipa={ipa} word={card.front} className="text-lg" />}
              <SpeakButtons text={card.front} className="justify-center" />
              {card.example && (
                <div className="rounded-2xl bg-muted p-4 text-left">
                  <p className="text-base leading-relaxed">{card.example}</p>
                </div>
              )}
            </div>
          ) : gap ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Điền từ còn thiếu</p>
              {done ? (
                <ReadableSentence text={card.front} />
              ) : (
                <p className="text-2xl font-semibold leading-relaxed sm:text-3xl">{withGap(card.front, gap.index)}</p>
              )}
              <p className="text-base text-primary-edge">{card.back}</p>
            </div>
          ) : variant === "spell" ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Viết từ có nghĩa là</p>
              <p className="text-2xl font-bold text-primary-edge sm:text-3xl">{card.back}</p>
              {card.example && (
                <div className="space-y-1 rounded-2xl bg-muted p-4 text-left">
                  <p className="text-base leading-relaxed">{done ? card.example : blankOut(card.example, card.front)}</p>
                  {card.exampleVi && <p className="text-sm text-muted-foreground">{card.exampleVi}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Nghe và viết lại từ</p>
              <div className="flex justify-center gap-2">
                <Button size="lg" onClick={() => speak(card.front)}>
                  Nghe lại
                </Button>
                <Button size="lg" variant="outline" onClick={() => speak(card.front, SLOW_RATE)}>
                  Nghe chậm
                </Button>
              </div>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
            className="space-y-3"
          >
            <Input
              ref={input}
              value={value}
              onChange={(event) => type(event.target.value)}
              readOnly={done}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              lang={vietnamese ? "vi" : "en"}
              placeholder={vietnamese ? "Gõ nghĩa tiếng Việt (có dấu hay không đều được)" : "Gõ từ tiếng Anh"}
              aria-label="Câu trả lời"
              className={cn(
                "h-12 text-center text-lg",
                solved && "border-rate-good text-rate-good",
                missed && !done && "border-rate-again",
              )}
            />

            {marks && <Marks marks={marks} checked={missed} />}

            {!done ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={hint} title="Sửa giúp chữ sai đầu tiên">
                  <LightbulbIcon />
                  Gợi ý
                </Button>
                <Button type="button" variant="outline" onClick={reveal}>
                  <EyeIcon />
                  Xem đáp án
                </Button>
                {variant === "spell" && <SpeakButtons text={card.front} />}
                <Button type="submit" className="ml-auto" disabled={!value.trim()}>
                  Kiểm tra
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "space-y-2 rounded-2xl border p-4 text-center",
                  solved ? "border-rate-good/40" : "border-rate-again/40",
                )}
              >
                <p className={cn("text-sm font-bold", solved ? "text-rate-good" : "text-muted-foreground")}>
                  {solved ? (missed ? "Đúng rồi, nhớ nhé!" : "Chính xác!") : vietnamese ? "Nghĩa đúng" : "Đáp án đúng"}
                </p>
                {vietnamese ? (
                  <>
                    <p className="text-2xl font-bold text-primary-edge">{card.back}</p>
                    {card.exampleVi && <p className="text-sm text-muted-foreground">{card.exampleVi}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{word}</p>
                    {ipa && <IpaButton ipa={ipa} word={card.front} />}
                    {variant === "listen" && <p className="text-sm">{card.back}</p>}
                    <SpeakButtons text={word} size="xs" className="justify-center" />
                  </>
                )}
                {revealed && (
                  <div className="pt-1">
                    <Button type="submit" autoFocus>
                      Tiếp <ArrowRightIcon />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** The answer as letter slots: empty, typed, or once checked right, wrong, one too many, or still missing. */
function Marks({ marks, checked }: { marks: CharMark[]; checked: boolean }) {
  return (
    <div className="space-y-1.5 text-center">
      <p aria-live="polite" className="flex flex-wrap justify-center gap-1 font-mono text-lg">
        {marks.map((mark, i) => {
          const space = mark.kind === "missing" ? mark.space : mark.char === " ";
          if (space && mark.kind !== "extra" && mark.kind !== "wrong") return <span key={i} className="w-3" />;
          return (
            <span
              key={i}
              className={cn(
                "grid h-9 w-7 place-items-center rounded-md border bg-card",
                mark.kind === "missing" && (checked ? "border-dashed border-rate-again/60" : "border-dashed"),
                mark.kind === "typed" && "border-foreground/30",
                mark.kind === "ok" && "border-rate-good text-rate-good",
                mark.kind === "wrong" && "border-rate-again bg-rate-again/10 font-bold text-rate-again",
                mark.kind === "extra" && "border-rate-again text-rate-again line-through",
              )}
            >
              {mark.kind === "missing" ? "" : mark.char === " " ? "\u00a0" : mark.char}
            </span>
          );
        })}
      </p>
      {checked && (
        <p className="text-xs text-muted-foreground">
          Chữ đỏ là chữ sai, chữ gạch là chữ thừa, ô trống là chữ còn thiếu. Sửa rồi bấm Kiểm tra.
        </p>
      )}
    </div>
  );
}
