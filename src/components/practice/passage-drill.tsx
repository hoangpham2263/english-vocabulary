
import { useState } from "react";
import { OrderDrill } from "@/components/practice/order-drill";
import type { DrillProps } from "@/components/practice/practice-session";
import { ReadDrill } from "@/components/practice/read-drill";
import { SentenceDrill } from "@/components/practice/sentence-drill";
import { SpeakDrill } from "@/components/practice/speak-drill";
import type { PracticeMode } from "@/lib/practice";
import { asParagraph, passagePairs } from "@/lib/sentence";
import { cn } from "@/lib/utils";

/**
 * A passage, worked through one sentence at a time with the sentence drills.
 * The whole passage stays in view: sentences done show both languages, the
 * current one is marked, the rest show only what the drill may reveal. The
 * passage counts as right when every sentence was right first time. Reading
 * is the exception: the whole paragraph at once.
 */
export function PassageDrill({ card, onResult, mode }: DrillProps & { mode: PracticeMode }) {
  const pairs = passagePairs(card);
  const [index, setIndex] = useState(0);
  const [allRight, setAllRight] = useState(true);

  if (mode === "read") {
    return <ReadDrill card={{ ...card, front: asParagraph(card.front), back: asParagraph(card.back) }} onResult={onResult} />;
  }

  const pair = pairs[index];
  const sentence = { ...card, id: card.id * 100 + index, type: "sentence" as const, front: pair.en, back: pair.vi, note: null };
  const onSentence = (correct: boolean) => {
    if (index + 1 >= pairs.length) return onResult(allRight && correct);
    setAllRight((ok) => ok && correct);
    setIndex(index + 1);
  };
  // What a sentence not yet done may show: never the language being produced.
  const ahead = (p: { en: string; vi: string }) =>
    mode === "toVi" || mode === "speak" ? p.en : mode === "dictation" ? "…" : p.vi;

  const drill = { card: sentence, onResult: onSentence };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-semibold text-muted-foreground">
        Câu {index + 1}/{pairs.length} của đoạn
      </p>

      {mode === "order" && <OrderDrill key={index} {...drill} />}
      {mode === "toEn" && <SentenceDrill key={index} {...drill} variant="toEn" />}
      {mode === "toVi" && <SentenceDrill key={index} {...drill} variant="toVi" />}
      {mode === "dictation" && <SentenceDrill key={index} {...drill} variant="dictation" />}
      {mode === "speak" && <SpeakDrill key={index} {...drill} />}

      <section className="space-y-1.5 rounded-2xl border bg-card px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">Cả đoạn</p>
        <ol className="space-y-1 text-sm leading-relaxed">
          {pairs.map((p, i) => (
            <li
              key={i}
              className={cn(
                "rounded-md px-2 py-1",
                i === index ? "bg-accent font-semibold text-foreground" : "text-muted-foreground",
                i > index && "opacity-70",
              )}
            >
              {i < index ? (
                <>
                  {p.en} <span className="text-xs">({p.vi})</span>
                </>
              ) : i === index ? (
                `Câu ${i + 1}: đang làm`
              ) : (
                ahead(p)
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
