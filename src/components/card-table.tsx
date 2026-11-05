import { IpaButton } from "@/components/ipa-button";
import { PencilIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { PlantIcon } from "@/components/plant-icon";
import { SoundListButton, SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import type { Card } from "@/lib/types";
import { vietnamDay } from "@/lib/srs";
import { ipaFor, type Accent } from "@/lib/accent";
import { keyWord, spokenText } from "@/lib/practice";
import { cardUnitName } from "@/lib/deck-kind";
import { asParagraph } from "@/lib/sentence";
import { cn } from "@/lib/utils";
import { cardStatus } from "@/lib/study";

function dueLabel(dueAt: string | null, today: string) {
  if (!dueAt) return null;
  if (dueAt <= today) return "Ôn hôm nay";
  const [y, m, d] = dueAt.split("-");
  return `Ôn ${d}/${m}${y === today.slice(0, 4) ? "" : `/${y}`}`;
}

// Word list in the Memrise level layout: plant, word, meaning, one row each.
export function CardTable({ cards, deckSlug, accent }: { cards: Card[]; deckSlug: string; accent: Accent }) {
  const today = vietnamDay();

  if (cards.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed py-10 text-center text-sm text-muted-foreground">Không có thẻ nào khớp.</p>;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
      {cards.map((card) => {
        const status = cardStatus(card);
        const due = dueLabel(card.dueAt, today);
        const unit = cardUnitName(card);
        return (
          <li key={card.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <PlantIcon status={status} />
            <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-2 sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className={cn("font-bold", card.type === "passage" && "line-clamp-2 font-semibold")}>{asParagraph(card.front)}</p>
                {ipaFor(card, accent) && <IpaButton ipa={ipaFor(card, accent)!} word={card.front} className="-ml-1.5 text-xs" />}
                {card.type === "sound" && card.example && <p className="text-xs text-muted-foreground">{card.example}</p>}
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm sm:text-base", card.type === "passage" && "line-clamp-2")}>{asParagraph(card.back)}</p>
                <p className="text-xs text-muted-foreground">
                  {[unit, due].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {card.type === "sound" ? (
                <SoundListButton front={card.front} keyWord={keyWord(card)} />
              ) : card.type === "vocab" || card.type === "idiom" || card.type === "sentence" || card.type === "passage" ? (
                <SpeakButton text={spokenText(card)} />
              ) : null}
              <Button asChild variant="outline" size="icon" className="size-8">
                <Link
                  href={`/${deckSlug}/${card.id}/edit`}
                  title={card.dueAt ? `Sửa thẻ. Khoảng ôn ${card.intervalDays} ngày, quên ${card.lapses} lần` : "Sửa thẻ"}
                  aria-label={`Sửa ${card.front}`}
                >
                  <PencilIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
