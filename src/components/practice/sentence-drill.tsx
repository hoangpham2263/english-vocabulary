
import { ArrowRightIcon, CheckIcon, EyeIcon, LightbulbIcon, SnailIcon, Volume2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DrillProps } from "@/components/practice/practice-session";
import { ReadableSentence } from "@/components/practice/readable-sentence";
import { ListenButton, NORMAL_RATE, SLOW_RATE, speak } from "@/components/speak-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  TRANSLATION_PASS,
  hintWords,
  markWords,
  sentenceMatches,
  translationOverlap,
  wordKeys,
  type WordMark,
} from "@/lib/sentence";
import { cn } from "@/lib/utils";

/**
 * Typing a whole sentence.
 * "toEn": read the Vietnamese, write the English.
 * "dictation": hear the English, write it down.
 * "toVi": read the English (with word help), write a Vietnamese translation.
 *
 * English answers are checked word by word like the letter drills: a wrong
 * answer is marked, never shown, until the learner asks. A free translation
 * into Vietnamese has many right answers, so after a close-enough check the
 * learner compares with the reference and judges it themselves.
 */
export function SentenceDrill({ card, onResult, variant }: DrillProps & { variant: "toEn" | "toVi" | "dictation" }) {
  const english = variant !== "toVi";
  const reference = english ? card.front : card.back;
  const [value, setValue] = useState("");
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const done = solved || revealed;
  const marks = english && missed && !done && value.trim() ? markWords(value, reference) : null;

  useEffect(() => {
    if (variant === "dictation") speak(card.front);
  }, [variant, card.front]);

  // English is accepted as soon as the last word is right, without Enter. A
  // Vietnamese translation has many right answers, so it still waits for Enter.
  function type(next: string) {
    setValue(next);
    if (done || !english || !sentenceMatches(next, reference)) return;
    setSolved(true);
    speak(card.front);
  }

  function check() {
    if (done || !value.trim()) return;
    if (english) {
      if (sentenceMatches(value, reference)) {
        setSolved(true);
        speak(card.front);
      } else {
        setMissed(true);
        input.current?.focus();
      }
    } else if (translationOverlap(value, reference) >= TRANSLATION_PASS) {
      setSolved(true);
    } else {
      // Free translation: show the reference and let the learner judge.
      setRevealed(true);
    }
  }

  function hint() {
    setMissed(true);
    type(`${hintWords(value, reference)} `);
    input.current?.focus();
  }

  function reveal() {
    setMissed(true);
    setRevealed(true);
    if (english) speak(card.front);
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="space-y-5 px-5 py-6 sm:px-8">
          {variant === "toEn" && (
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Dịch sang tiếng Anh</p>
              <p className="text-xl font-bold text-primary-edge sm:text-2xl">{card.back}</p>
              <p className="text-xs text-muted-foreground">{wordKeys(card.front).length} từ</p>
            </div>
          )}
          {variant === "dictation" && (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Nghe và chép lại cả câu</p>
              <div className="flex justify-center gap-2">
                <ListenButton icon={Volume2Icon} onClick={() => speak(card.front, NORMAL_RATE)}>
                  Nghe lại
                </ListenButton>
                <ListenButton icon={SnailIcon} onClick={() => speak(card.front, SLOW_RATE)}>
                  Nghe chậm
                </ListenButton>
              </div>
              <p className="text-xs text-muted-foreground">{wordKeys(card.front).length} từ</p>
            </div>
          )}
          {variant === "toVi" && (
            <div className="space-y-2">
              <p className="text-center text-sm font-semibold text-muted-foreground">Dịch sang tiếng Việt</p>
              <ReadableSentence text={card.front} />
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
            className="space-y-3"
          >
            <Textarea
              ref={input}
              value={value}
              onChange={(event) => type(event.target.value)}
              onKeyDown={(event) => {
                // Enter checks, Shift+Enter is a new line.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (revealed) onResult(false);
                  else check();
                }
              }}
              readOnly={done}
              autoFocus
              rows={2}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              lang={english ? "en" : "vi"}
              placeholder={english ? "Gõ câu tiếng Anh" : "Gõ bản dịch tiếng Việt"}
              aria-label="Câu trả lời"
              className={cn(
                "min-h-20 resize-none text-center text-lg",
                solved && "border-rate-good text-rate-good",
                marks && "border-rate-again",
              )}
            />

            {marks && <WordMarks marks={marks} />}

            {!done ? (
              <div className="flex flex-wrap gap-2">
                {english && (
                  <Button type="button" variant="outline" onClick={hint} title="Sửa giúp từ sai đầu tiên">
                    <LightbulbIcon />
                    Gợi ý
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={reveal}>
                  <EyeIcon />
                  Xem đáp án
                </Button>
                <Button type="submit" className="ml-auto" disabled={!value.trim()}>
                  Kiểm tra
                </Button>
              </div>
            ) : (
              <Answer
                card={card}
                variant={variant}
                solved={solved}
                missed={missed}
                judge={!english && !solved && !missed}
                onResult={onResult}
              />
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Answer({
  card,
  variant,
  solved,
  missed,
  judge,
  onResult,
}: {
  card: DrillProps["card"];
  variant: "toEn" | "toVi" | "dictation";
  solved: boolean;
  missed: boolean;
  /** A Vietnamese translation the checker could not settle: the learner decides. */
  judge: boolean;
  onResult: (correct: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border p-4 text-center animate-in fade-in-0",
        solved ? "border-rate-good/40" : judge ? "border-primary/40" : "border-rate-again/40",
      )}
    >
      <p className={cn("text-sm font-bold", solved ? "text-rate-good" : "text-muted-foreground")}>
        {solved ? (missed ? "Đúng rồi, nhớ nhé!" : "Chính xác!") : judge ? "So với bản dịch mẫu" : "Đáp án đúng"}
      </p>
      {variant === "toVi" ? (
        <p className="text-xl font-bold text-primary-edge">{card.back}</p>
      ) : (
        <>
          <ReadableSentence text={card.front} className="text-xl sm:text-2xl" />
          {variant === "dictation" && <p className="text-sm text-muted-foreground">{card.back}</p>}
        </>
      )}
      {judge ? (
        <>
          <p className="text-xs text-muted-foreground">Một câu có nhiều cách dịch. Bản của bạn có đúng ý không?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="again" onClick={() => onResult(false)}>
              <XIcon />
              Chưa đúng ý
            </Button>
            <Button type="button" variant="good" onClick={() => onResult(true)} autoFocus>
              <CheckIcon />
              Đúng ý
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-end">
          <Button type="button" onClick={() => onResult(solved && !missed)} autoFocus>
            Tiếp <ArrowRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}

/** The typed sentence word by word: right, wrong, one too many, or a gap for a missing word. */
function WordMarks({ marks }: { marks: WordMark[] }) {
  return (
    <div className="space-y-1.5 text-center">
      <p aria-live="polite" className="flex flex-wrap justify-center gap-1 text-base">
        {marks.map((mark, i) => (
          <span
            key={i}
            className={cn(
              "min-w-10 rounded-md border bg-card px-2 py-0.5",
              mark.kind === "missing" && "border-dashed border-rate-again/60",
              mark.kind === "ok" && "border-rate-good text-rate-good",
              mark.kind === "wrong" && "border-rate-again bg-rate-again/10 font-bold text-rate-again",
              mark.kind === "extra" && "border-rate-again text-rate-again line-through",
            )}
          >
            {mark.kind === "missing" ? " " : mark.text}
          </span>
        ))}
      </p>
      <p className="text-xs text-muted-foreground">
        Từ đỏ là từ sai, từ gạch là từ thừa, ô trống là từ còn thiếu. Sửa rồi bấm Kiểm tra.
      </p>
    </div>
  );
}
