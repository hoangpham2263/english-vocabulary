import { BookOpenIcon, RotateCcwIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { PlantIcon } from "@/components/plant-icon";
import { Button } from "@/components/ui/button";
import { DECK_GROUPS, ITEM_NOUN, deckGroup, deckKind } from "@/lib/deck-kind";
import type { DeckSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// Each course gets its own cover, like a Memrise dashboard, in Hoàn Hời blues.
const COVERS = [
  "from-[#1877f2] to-[#0b5fcc]",
  "from-[#0b5fcc] to-[#084a9e]",
  "from-[#1467d8] to-[#0b4fae]",
];

export function CourseProgress({ deck }: { deck: DeckSummary }) {
  const studied = deck.total - deck.newCount;
  const percent = deck.total > 0 ? (studied / deck.total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <b className="text-base tabular-nums">{studied}</b>
          <span className="text-muted-foreground">/{deck.total} {ITEM_NOUN[deckKind(deck.slug)]} đã học</span>
        </span>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(percent)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-plant-grown transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PlantCounts({ deck }: { deck: DeckSummary }) {
  const young = deck.total - deck.newCount - deck.learning - deck.mature;
  const items = [
    { status: "learning" as const, n: deck.learning },
    { status: "young" as const, n: young },
    { status: "mature" as const, n: deck.mature },
  ];
  return (
    <div className="flex items-center gap-4 text-sm font-semibold tabular-nums">
      {items.map((item) => (
        <span key={item.status} className="flex items-center gap-1">
          <PlantIcon status={item.status} className="size-4" />
          {item.n}
        </span>
      ))}
    </div>
  );
}

export function CourseCard({ deck, index, canLearn }: { deck: DeckSummary; index: number; canLearn: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <Link href={`/${deck.slug}`} className={cn("block bg-gradient-to-br px-5 py-4 text-white", COVERS[index % COVERS.length])}>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
          {DECK_GROUPS.find((group) => group.key === deckGroup(deck.slug))?.title ?? "Khoá học"}
        </p>
        <p className="text-lg font-bold leading-snug">{deck.name}</p>
      </Link>
      <div className="space-y-4 p-5">
        <CourseProgress deck={deck} />
        <div className="flex items-center justify-between gap-2">
          <PlantCounts deck={deck} />
          {deck.due > 0 && <span className="text-sm font-semibold text-rate-good">{deck.due} cần ôn</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {deck.due > 0 ? (
            <Button asChild>
              <Link href={`/${deck.slug}/review`}>
                <RotateCcwIcon />
                Ôn tập
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/${deck.slug}`}>Xem {ITEM_NOUN[deckKind(deck.slug)]}</Link>
            </Button>
          )}
          <Button asChild variant={deck.due > 0 || !canLearn || deck.newCount === 0 ? "outline" : "default"}>
            <Link href={`/${deck.slug}/learn`}>
              <BookOpenIcon />
              Học mới
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
