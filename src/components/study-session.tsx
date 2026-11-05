
import { ExampleIpaList, IpaButton, SoundSymbol } from "@/components/ipa-button";
import { ArrowLeftIcon, EyeIcon, PencilIcon, RotateCcwIcon, TrophyIcon, Undo2Icon, XIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { answerCard, undoAnswer } from "@/actions/study";
import { useAccent } from "@/components/accent-provider";
import { SoundButtons } from "@/components/sound-buttons";
import { SpeakButtons, speak } from "@/components/speak-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatInterval,
  previewIntervals,
  requeue,
  type CardSchedule,
  type Rating,
} from "@/lib/srs";
import { ipaFor } from "@/lib/accent";
import { spokenText } from "@/lib/practice";
import { cardUnitName } from "@/lib/deck-kind";
import { asParagraph } from "@/lib/sentence";
import { CARD_TYPE_LABELS, type StudyCard } from "@/lib/study";
import { cn } from "@/lib/utils";

type Item = {
  card: StudyCard;
  /** Shown whole on first sight (learning a new word) rather than as a recall test. */
  intro: boolean;
};

type LastAnswer = { reviewId: number; item: Item; queue: Item[]; rating: Rating; revealed: boolean };

/** One graded answer, newest last; the side list numbers cards by when they first came up. */
type Answer = { cardId: number; rating: Rating };

// Learners no longer pick one of four grades: moving on counts as "good",
// and only "not remembered" is a separate, optional choice.
const DEFAULT_RATING: Rating = 2;

const AUTO_SPEAK_KEY = "english-vocabulary:auto-speak";

// A per-device preference; storage can be unavailable (private mode), so every
// access is guarded and the default is simply "off".
const autoSpeakListeners = new Set<() => void>();

function readAutoSpeak() {
  try {
    return window.localStorage.getItem(AUTO_SPEAK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAutoSpeak(value: boolean) {
  try {
    window.localStorage.setItem(AUTO_SPEAK_KEY, value ? "1" : "0");
  } catch {}
  autoSpeakListeners.forEach((listener) => listener());
}

function subscribeAutoSpeak(listener: () => void) {
  autoSpeakListeners.add(listener);
  return () => autoSpeakListeners.delete(listener);
}

export function StudySession({
  cards,
  mode,
  backHref,
  backLabel,
}: {
  cards: StudyCard[];
  mode: "review" | "learn";
  backHref: string;
  backLabel: string;
}) {
  const [queue, setQueue] = useState<Item[]>(() => cards.map((card) => ({ card, intro: mode === "learn" })));
  const [revealed, setRevealed] = useState(mode === "learn");
  const [tally, setTally] = useState<Record<Rating, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [answered, setAnswered] = useState(0);
  const [last, setLast] = useState<LastAnswer | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Latest schedule of every card this session has graded, so a past card can be reopened.
  const [graded, setGraded] = useState<Record<number, StudyCard>>({});
  const [peekId, setPeekId] = useState<number | null>(null);
  const autoSpeak = useSyncExternalStore(subscribeAutoSpeak, readAutoSpeak, () => false);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  const current = queue[0];
  const accent = useAccent();

  useEffect(() => {
    if (current && autoSpeak && current.card.type !== "writing") speak(spokenText(current.card));
  }, [current, autoSpeak]);

  const rate = useCallback(
    (rating: Rating) => {
      if (!current || busy.current) return;
      busy.current = true;
      startTransition(async () => {
        const result = await answerCard({ cardId: current.card.id, rating });
        busy.current = false;
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const updated: StudyCard = { ...current.card, ...result.card };
        const rest = queue.slice(1);
        // An "again" answer stays in this session, a few cards later, as a recall test.
        const nextQueue = result.card.intervalDays === 0 ? requeue(rest, { card: updated, intro: false }) : rest;
        setLast({ reviewId: result.reviewId, item: current, queue, rating, revealed });
        setQueue(nextQueue);
        setRevealed(nextQueue[0]?.intro ?? false);
        setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
        setAnswered((n) => n + 1);
        setAnswers((list) => [...list, { cardId: updated.id, rating }]);
        setGraded((map) => ({ ...map, [updated.id]: updated }));
      });
    },
    [current, queue, revealed],
  );

  const peekCard = peekId === null ? null : (graded[peekId] ?? null);
  const peekQueued = peekId !== null && queue.some((item) => item.card.id === peekId);

  // A card already graded and forgotten since: grade it "again" and slot it back
  // in a few cards after the one being studied.
  const relearn = useCallback(() => {
    if (!peekCard || peekQueued || busy.current) return;
    busy.current = true;
    startTransition(async () => {
      const result = await answerCard({ cardId: peekCard.id, rating: 0 });
      busy.current = false;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const updated: StudyCard = { ...peekCard, ...result.card };
      const item: Item = { card: updated, intro: false };
      setLast({ reviewId: result.reviewId, item, queue, rating: 0, revealed });
      setQueue(queue.length > 0 ? [queue[0], ...requeue(queue.slice(1), item)] : [item]);
      if (queue.length === 0) setRevealed(false);
      setTally((t) => ({ ...t, 0: t[0] + 1 }));
      setAnswered((n) => n + 1);
      setAnswers((list) => [...list, { cardId: updated.id, rating: 0 }]);
      setGraded((map) => ({ ...map, [updated.id]: updated }));
      setPeekId(null);
      toast(`Sẽ nhắc lại “${updated.front}” sau vài thẻ`);
    });
  }, [peekCard, peekQueued, queue, revealed]);

  const undo = useCallback(() => {
    if (!last || busy.current) return;
    busy.current = true;
    startTransition(async () => {
      const result = await undoAnswer(last.reviewId);
      busy.current = false;
      if (!result.ok) {
        toast.error(result.error);
        setLast(null);
        return;
      }
      setQueue(last.queue);
      setRevealed(last.revealed || last.queue[0]?.card.id === last.item.card.id);
      setTally((t) => ({ ...t, [last.rating]: Math.max(0, t[last.rating] - 1) }));
      setAnswered((n) => Math.max(0, n - 1));
      setAnswers((list) => list.slice(0, -1));
      setGraded((map) => ({ ...map, [last.item.card.id]: { ...last.item.card, ...result.card } }));
      setPeekId(null);
      setLast(null);
      toast("Đã hoàn tác câu trả lời vừa rồi");
    });
  }, [last]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [role=listbox]")) return;
      if (event.metaKey || event.altKey) return;
      if ((event.key === "z" || event.key === "Z") && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (peekCard) {
        if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          setPeekId(null);
        } else if (event.key === "r" || event.key === "R") {
          speak(spokenText(peekCard));
        } else if (event.key === "1") {
          event.preventDefault();
          relearn();
        }
        return;
      }
      if (!current) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        // First press reveals, the next one moves on with the default grade.
        if (!revealed) setRevealed(true);
        else rate(DEFAULT_RATING);
        return;
      }
      if (event.key === "r" || event.key === "R") {
        speak(spokenText(current.card));
        return;
      }
      if (revealed && event.key === "1") {
        event.preventDefault();
        rate(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, rate, undo, peekCard, relearn]);

  const total = answered + queue.length;
  const remaining = {
    fresh: queue.filter((item) => item.intro).length,
    learning: queue.filter((item) => !item.intro && item.card.intervalDays === 0).length,
    review: queue.filter((item) => !item.intro && item.card.intervalDays > 0).length,
  };

  // Numbered by first appearance; the latest grade decides how a number is marked.
  const history: { card: StudyCard; rating: Rating }[] = [];
  const order = new Map<number, number>();
  for (const answer of answers) {
    const at = order.get(answer.cardId);
    if (at === undefined) {
      order.set(answer.cardId, history.length);
      history.push({ card: graded[answer.cardId], rating: answer.rating });
    } else {
      history[at] = { ...history[at], rating: answer.rating };
    }
  }

  if (!current) {
    return <SessionDone answered={answered} tally={tally} backHref={backHref} backLabel={backLabel} onUndo={last ? undo : undefined} />;
  }

  const card = peekCard ?? current.card;
  const showAnswer = peekCard !== null || revealed;
  const unit = cardUnitName(card);
  const intervals = previewIntervals(current.card as CardSchedule);
  const peekNumber = peekId === null ? 0 : (order.get(peekId) ?? 0) + 1;

  return (
    <SessionLayout
      aside={<CardList history={history} currentId={current.card.id} peekId={peekId} onPick={setPeekId} />}
    >
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Dừng buổi học"
          aria-label="Dừng buổi học"
        >
          <XIcon className="size-5" />
        </Link>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-plant-grown transition-[width] duration-500"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-bold tabular-nums">
          <span className={cn("text-rate-easy", current.intro && "underline underline-offset-4")} title="Thẻ mới">
            {remaining.fresh}
          </span>
          <span
            className={cn("text-rate-again", !current.intro && current.card.intervalDays === 0 && "underline underline-offset-4")}
            title="Đang học"
          >
            {remaining.learning}
          </span>
          <span
            className={cn("text-rate-good", !current.intro && current.card.intervalDays > 0 && "underline underline-offset-4")}
            title="Ôn tập"
          >
            {remaining.review}
          </span>
        </div>
      </div>

      {peekCard && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-secondary px-4 py-2.5 text-sm">
          <span>
            Đang xem lại thẻ số <b className="tabular-nums">{peekNumber}</b>
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setPeekId(null)}>
            <ArrowLeftIcon />
            Về thẻ đang học
          </Button>
        </div>
      )}

      <Card className="min-h-[22rem] gap-0 rounded-3xl border py-0">
        <CardContent className="flex flex-1 flex-col px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{CARD_TYPE_LABELS[card.type]}</Badge>
            {unit && <Badge variant="outline">{unit}</Badge>}
            {!peekCard && current.intro && (
              <Badge className="bg-secondary text-secondary-foreground">
                {card.type === "passage" ? "Đoạn mới" : card.type === "sentence" ? "Câu mới" : "Từ mới"}
              </Badge>
            )}
            {!peekCard && !current.intro && card.intervalDays === 0 && card.reps > 0 && (
              <Badge className="bg-rate-again/15 text-rate-again">Học lại</Badge>
            )}
            <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 text-muted-foreground">
              <input
                type="checkbox"
                className="accent-primary"
                checked={autoSpeak}
                onChange={(event) => writeAutoSpeak(event.target.checked)}
              />
              Tự đọc
            </label>
          </div>

          <div className="flex flex-col items-center gap-2 py-8 text-center">
            {card.type === "sound" ? (
              <SoundSymbol front={card.front} className="text-4xl font-bold tracking-tight sm:text-5xl" />
            ) : card.type === "passage" ? (
              <p className="text-left text-lg leading-relaxed break-words">{asParagraph(card.front)}</p>
            ) : card.type === "sentence" ? (
              <p className="text-2xl font-semibold leading-snug break-words sm:text-3xl">{card.front}</p>
            ) : (
              <p className="text-4xl font-bold tracking-tight break-words sm:text-5xl">{card.front}</p>
            )}
            {ipaFor(card, accent) && <IpaButton ipa={ipaFor(card, accent)!} word={card.front} className="text-lg" />}
            {card.type === "sound" ? (
              <SoundButtons card={card} />
            ) : card.type === "vocab" || card.type === "idiom" || card.type === "sentence" || card.type === "passage" ? (
              <SpeakButtons text={spokenText(card)} className="mt-1" />
            ) : null}
          </div>

          {/* The English example shows before the answer so the meaning can be guessed
              from context; its translation waits for the reveal. A sound card's example
              lists words with their IPA, which would give the sound away. */}
          {card.example && card.type !== "sound" && (
            <div className="mb-5 space-y-2 rounded-2xl bg-muted p-4">
              <p className="text-base leading-relaxed">{card.example}</p>
              {showAnswer && card.exampleVi && (
                <p className="text-sm text-muted-foreground animate-in fade-in-0">{card.exampleVi}</p>
              )}
              <SpeakButtons text={card.example} size="xs" label="Nghe câu" />
            </div>
          )}

          {showAnswer ? (
            <div className="space-y-4 border-t pt-5 animate-in fade-in-0 slide-in-from-bottom-1">
              {card.type === "passage" ? (
                <p className="text-base leading-relaxed text-brand">{asParagraph(card.back)}</p>
              ) : (
                <p className="text-center text-2xl font-bold text-brand">{card.back}</p>
              )}
              {card.example && card.type === "sound" && (
                <div className="space-y-2 rounded-2xl bg-muted p-4">
                  {card.exampleVi && <ExampleIpaList example={card.example} transcriptions={card.exampleVi} />}
                  <SpeakButtons text={card.example} size="xs" label="Nghe các từ" />
                </div>
              )}
              {card.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{card.note}</p>}
            </div>
          ) : (
            <div className="mt-auto flex justify-center pt-4">
              <Button size="lg" className="w-full sm:w-72" onClick={() => setRevealed(true)}>
                <EyeIcon />
                Hiện đáp án
                <kbd className="ml-1 rounded-md bg-white/20 px-1.5 text-[11px]">Space</kbd>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {peekCard ? (
        <div className="sticky bottom-3 space-y-2">
          <Button size="lg" onClick={() => setPeekId(null)} className="h-14 w-full flex-col gap-0">
            <span className="text-base font-bold">Về thẻ đang học</span>
            <span className="text-xs font-normal text-white/90">Space · Esc</span>
          </Button>
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={pending || peekQueued}
              onClick={relearn}
              className="text-rate-again hover:text-rate-again"
              title="Chấm lại là chưa nhớ, thẻ quay lại sau vài thẻ (phím 1)"
            >
              <RotateCcwIcon />
              {peekQueued ? "Thẻ này đã đợi nhắc lại" : "Quên rồi, nhắc lại thẻ này"}
            </Button>
          </div>
        </div>
      ) : (
        revealed && (
          <div className="sticky bottom-3 space-y-2">
            <Button
              size="lg"
              disabled={pending}
              onClick={() => rate(DEFAULT_RATING)}
              className="h-14 w-full flex-col gap-0"
            >
              <span className="text-base font-bold">Tiếp</span>
              <span className="text-xs font-normal text-white/90">
                {intervals[DEFAULT_RATING] > 0 ? `Ôn lại sau ${formatInterval(intervals[DEFAULT_RATING])}` : "Ôn lại ngay"} · Space
              </span>
            </Button>
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => rate(0)}
                className="text-rate-again hover:text-rate-again"
                title="Từ này sẽ quay lại ngay trong buổi (phím 1)"
              >
                Chưa nhớ, nhắc lại ngay
              </Button>
            </div>
          </div>
        )
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button variant="outline" size="sm" disabled={!last || pending} onClick={undo} title="Hoàn tác câu trả lời vừa rồi (Z)">
          <Undo2Icon />
          Hoàn tác
        </Button>
        <span className="hidden sm:inline">Space lật thẻ rồi tiếp · 1 chưa nhớ · R đọc · Z hoàn tác</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${card.deckSlug}/${card.id}/edit`} title="Sửa thẻ này">
            <PencilIcon />
            Sửa
          </Link>
        </Button>
      </div>
    </SessionLayout>
  );
}

/** The session column, with the numbered card list beside it on wide screens and below it on narrow ones. */
function SessionLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl gap-6 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,42rem)_13rem] lg:justify-center">
      <div className="space-y-4">{children}</div>
      <div className="mt-6 lg:mt-0">{aside}</div>
    </div>
  );
}

/** Cards this session has graded, numbered in the order they came up; any of them can be reopened. */
function CardList({
  history,
  currentId,
  peekId,
  onPick,
}: {
  history: { card: StudyCard; rating: Rating }[];
  currentId: number | null;
  peekId: number | null;
  onPick: (id: number | null) => void;
}) {
  const currentIndex = history.findIndex((entry) => entry.card.id === currentId);
  const newCurrent = currentId !== null && currentIndex === -1;

  return (
    <aside className="lg:sticky lg:top-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Đã học trong buổi · bấm để xem lại</p>
      <ol className="max-h-72 space-y-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-8rem)]">
        {history.map(({ card, rating }, index) => {
          const active = card.id === peekId || (peekId === null && card.id === currentId);
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onPick(card.id === peekId || card.id === currentId ? null : card.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  active ? "border-primary bg-secondary" : "border-transparent",
                )}
                title={card.back}
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{card.front}</span>
                {rating === 0 && <span className="size-2 shrink-0 rounded-full bg-rate-again" title="Chưa nhớ" />}
              </button>
            </li>
          );
        })}
        {newCurrent && (
          <li>
            <button
              type="button"
              onClick={() => onPick(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm",
                peekId === null ? "border-primary bg-secondary" : "border-dashed hover:bg-accent",
              )}
            >
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{history.length + 1}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">Thẻ đang học</span>
            </button>
          </li>
        )}
      </ol>
    </aside>
  );
}

function SessionDone({
  answered,
  tally,
  backHref,
  backLabel,
  onUndo,
}: {
  answered: number;
  tally: Record<Rating, number>;
  backHref: string;
  backLabel: string;
  onUndo?: () => void;
}) {
  const remembered = tally[1] + tally[2] + tally[3];
  const accuracy = answered > 0 ? Math.round((remembered / answered) * 100) : 0;

  return (
    <Card className="mx-auto max-w-md rounded-3xl border text-center">
      <CardContent className="space-y-5 py-6">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
          <TrophyIcon className="size-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-xl font-bold">{answered > 0 ? "Xong buổi học!" : "Không có thẻ nào ở đây"}</p>
          <p className="text-sm text-muted-foreground">
            {answered > 0
              ? `Đã chấm ${answered} lượt, nhớ được ${accuracy}%.`
              : "Không còn thẻ đến hạn hay từ mới trong phạm vi này."}
          </p>
        </div>
        {answered > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border p-2">
              <p className="text-lg font-bold tabular-nums">{answered - tally[0]}</p>
              <p className="text-xs text-muted-foreground">Nhớ</p>
            </div>
            <div className="rounded-2xl border p-2">
              <p className="text-lg font-bold tabular-nums">{tally[0]}</p>
              <p className="text-xs text-muted-foreground">Chưa nhớ</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onUndo && (
            <Button variant="outline" onClick={onUndo}>
              <Undo2Icon />
              Hoàn tác thẻ cuối
            </Button>
          )}
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
