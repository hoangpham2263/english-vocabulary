
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon, ShuffleIcon, TrophyIcon, XIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { useRouter } from "@/lib/router";
import { useCallback, useMemo, useState } from "react";
import { FlashcardDrill } from "@/components/practice/flashcard-drill";
import { OrderDrill } from "@/components/practice/order-drill";
import { PassageDrill } from "@/components/practice/passage-drill";
import { ReadDrill } from "@/components/practice/read-drill";
import { GlossaryProvider } from "@/components/practice/readable-sentence";
import { SentenceDrill } from "@/components/practice/sentence-drill";
import { QuizDrill } from "@/components/practice/quiz-drill";
import { SpeakDrill } from "@/components/practice/speak-drill";
import { TypeDrill } from "@/components/practice/type-drill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_RETRIES, PRACTICE_MODE_LABELS, type PracticeMode, type QuizQuestion } from "@/lib/practice";
import { REQUEUE_GAP, requeue } from "@/lib/srs";
import { asParagraph, type Glossary } from "@/lib/sentence";
import { cn } from "@/lib/utils";
import type { StudyCard } from "@/lib/study";

type Item = { card: StudyCard; tries: number };

/** A fresh order for the next endless pass, never opening on the card just done. */
function shuffledPass(cards: StudyCard[], lastId: number | undefined): Item[] {
  const order = [...cards];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.length > 1 && order[0].id === lastId) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  return order.map((card) => ({ card, tries: 0 }));
}

export type DrillProps = {
  card: StudyCard;
  /** Called once per attempt; the session moves on to the next card. */
  onResult: (correct: boolean) => void;
};

export function PracticeSession({
  cards,
  quiz,
  glossary = {},
  mode,
  endless = false,
  backHref,
}: {
  cards: StudyCard[];
  /** Word meanings for the reading help on sentence cards. */
  glossary?: Glossary;
  /** Server-decided question per card id, for the quiz mode. */
  quiz: Record<number, QuizQuestion>;
  mode: PracticeMode;
  /** Go through the cards again, reshuffled, every time a pass ends. */
  endless?: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [round, setRound] = useState(cards);
  const [queue, setQueue] = useState<Item[]>(() => cards.map((card) => ({ card, tries: 0 })));
  // First-attempt result per card: what the score reports.
  const [firstTry, setFirstTry] = useState<Map<number, boolean>>(() => new Map());
  const [step, setStep] = useState(0);
  // Items already left behind, newest last, so "Trước" can bring one back.
  const [history, setHistory] = useState<Item[]>([]);
  // Endless rounds only: which pass this is, and first-try answers over all passes.
  const [pass, setPass] = useState(1);
  const [total, setTotal] = useState({ answered: 0, correct: 0 });

  const current = queue[0];
  const noun = cards[0]?.type === "passage" ? "đoạn" : cards[0]?.type === "sentence" ? "câu" : "từ";
  const answered = firstTry.size;
  const correctFirst = useMemo(() => [...firstTry.values()].filter(Boolean).length, [firstTry]);

  const onResult = useCallback(
    (correct: boolean) => {
      if (!current) return;
      const first = !firstTry.has(current.card.id);
      if (first) {
        setTotal((t) => ({ answered: t.answered + 1, correct: t.correct + (correct ? 1 : 0) }));
      }
      const rest = queue.slice(1);
      // A miss comes back a few cards later, the way Memrise drills until it sticks.
      const next =
        !correct && current.tries < MAX_RETRIES
          ? requeue(rest, { card: current.card, tries: current.tries + 1 }, REQUEUE_GAP)
          : rest;
      setHistory((list) => [...list, current]);
      setStep((n) => n + 1);
      if (endless && next.length === 0) {
        // The pass is over: start the next one straight away, in a new order.
        setQueue(shuffledPass(round, current.card.id));
        setFirstTry(new Map());
        setPass((n) => n + 1);
        return;
      }
      setFirstTry((map) => (first ? new Map(map).set(current.card.id, correct) : map));
      setQueue(next);
    },
    [current, queue, firstTry, endless, round],
  );

  // Browse without answering: "Tiếp" moves the current item to the end of the
  // round, "Trước" brings back the last one left, answered or skipped.
  const goNext = () => {
    if (!current || queue.length < 2) return;
    setHistory((list) => [...list, current]);
    setQueue([...queue.slice(1), current]);
    setStep((n) => n + 1);
  };
  const goPrevious = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    // A skipped or missed card is still in the round; take it out before putting it first.
    setQueue([previous, ...queue.filter((item) => item.card.id !== previous.card.id)]);
    setStep((n) => n + 1);
  };

  const restart = (subset: StudyCard[]) => {
    setRound(subset);
    setQueue(subset.map((card) => ({ card, tries: 0 })));
    setFirstTry(new Map());
    setHistory([]);
    setStep((n) => n + 1);
  };

  if (!current) {
    const missed = round.filter((card) => firstTry.get(card.id) === false);
    const percent = round.length > 0 ? Math.round((correctFirst / round.length) * 100) : 0;
    return (
      <Card className="mx-auto max-w-xl rounded-3xl border text-center">
        <CardContent className="space-y-5 py-6">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
            <TrophyIcon className="size-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">Xong lượt {PRACTICE_MODE_LABELS[mode].title.toLowerCase()}!</p>
            <p className="text-sm text-muted-foreground">
              Đúng ngay lần đầu {correctFirst}/{round.length} {noun} ({percent}%). Luyện tập không làm thay đổi lịch ôn.
            </p>
          </div>
          {missed.length > 0 && (
            <div className="rounded-2xl border text-left">
              <p className="border-b px-4 py-2 text-sm font-semibold">{noun[0].toUpperCase()}{noun.slice(1)} cần xem lại ({missed.length})</p>
              <ul className="max-h-64 divide-y overflow-y-auto">
                {missed.map((card) => (
                  <li
                    key={card.id}
                    className={cn("flex justify-between gap-4 px-4 py-2 text-sm", noun !== "từ" && "flex-col gap-0.5")}
                  >
                    <span className={cn("font-semibold", noun === "đoạn" && "line-clamp-2")}>{asParagraph(card.front)}</span>
                    <span className={cn("text-muted-foreground", noun === "từ" && "text-right")}>{asParagraph(card.back)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {missed.length > 0 && (
              <Button onClick={() => restart(missed)}>
                <RotateCcwIcon />
                Luyện lại {missed.length} {noun} sai
              </Button>
            )}
            <Button variant="outline" onClick={() => router.refresh()}>
              <ShuffleIcon />
              Lượt mới ngẫu nhiên
            </Button>
            <Button asChild variant="outline">
              <Link href={backHref}>Quay lại</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const drill = { card: current.card, onResult };

  return (
    <GlossaryProvider value={glossary}>
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Dừng luyện tập"
          aria-label="Dừng luyện tập"
        >
          <XIcon className="size-5" />
        </Link>
        <Button
          variant="outline"
          size="icon"
          onClick={goPrevious}
          disabled={history.length === 0}
          title={`${noun[0].toUpperCase()}${noun.slice(1)} trước`}
          aria-label={`${noun} trước`}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-plant-grown transition-[width] duration-500"
            style={{ width: `${(answered / round.length) * 100}%` }}
          />
        </div>
        <span
          className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground"
          title={
            endless
              ? `Vòng ${pass}: đã làm ${answered}/${round.length} ${noun}. Tổng cộng đúng ngay lần đầu ${total.correct}/${total.answered}`
              : `Đã làm ${answered}/${round.length} ${noun}, đúng ngay lần đầu ${correctFirst}`
          }
        >
          {endless && <span className="mr-1.5 text-primary-edge">Vòng {pass}</span>}
          {answered}/{round.length}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={queue.length < 2}
          title={`Bỏ qua, sang ${noun} tiếp. ${noun[0].toUpperCase()}${noun.slice(1)} này quay lại cuối lượt`}
          aria-label={`${noun} tiếp`}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      </div>
      {current.tries > 0 && (
        <p className="text-center text-xs font-semibold text-rate-again">Làm lại {noun} vừa sai</p>
      )}
      {/* Remount per step so each drill starts clean, even for a repeated card. */}
      {current.card.type === "passage" ? (
        <PassageDrill key={step} {...drill} mode={mode} />
      ) : (
        <>
      {mode === "flashcard" && <FlashcardDrill key={step} {...drill} />}
      {mode === "quiz" && quiz[current.card.id] && <QuizDrill key={step} {...drill} question={quiz[current.card.id]} />}
      {mode === "spell" && <TypeDrill key={step} {...drill} variant="spell" />}
      {mode === "translate" && <TypeDrill key={step} {...drill} variant="translate" />}
      {mode === "listen" && <TypeDrill key={step} {...drill} variant="listen" />}
      {mode === "speak" && <SpeakDrill key={step} {...drill} />}
      {mode === "read" && <ReadDrill key={step} {...drill} />}
      {mode === "order" && <OrderDrill key={step} {...drill} />}
      {mode === "cloze" && <TypeDrill key={step} {...drill} variant="cloze" />}
      {mode === "toEn" && <SentenceDrill key={step} {...drill} variant="toEn" />}
      {mode === "toVi" && <SentenceDrill key={step} {...drill} variant="toVi" />}
      {mode === "dictation" && <SentenceDrill key={step} {...drill} variant="dictation" />}
        </>
      )}
    </div>
    </GlossaryProvider>
  );
}
