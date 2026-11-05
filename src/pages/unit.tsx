import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { useAccent } from "@/components/accent-provider";
import { CardTable } from "@/components/card-table";
import { DeckCredit } from "@/components/deck-credit";
import { PlantIcon } from "@/components/plant-icon";
import { PracticePanel } from "@/components/practice/practice-panel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ITEM_NOUN, deckKind, hasTopics, unitLabels } from "@/lib/deck-kind";
import { modesFor, practiceCounts as roundSizes } from "@/lib/practice";
import { Link, useParams } from "@/lib/router";
import { cardStatus, parseUnit, type CardStatus } from "@/lib/study";
import type { UnitPageData } from "@/lib/types";
import { DataPage } from "@/lib/use-data";
import { Loading } from "@/pages/loading";
import { NotFound } from "@/pages/not-found";

function unitTitle(slug: string, unit: number) {
  const kind = deckKind(slug);
  const name = unitLabels(kind)?.[unit];
  if (hasTopics(kind) && name) return `Chủ đề ${unit} · ${name}`;
  return name ? `Unit ${unit} · ${name}` : `Unit ${unit}`;
}

// One unit as a lesson, like a Memrise level: its progress, the two study
// actions scoped to it, practice for it alone, and its words.
function Content({ unit, data: { deck, units, quota, list, practiceCounts } }: { unit: number; data: UnitPageData }) {
  const accent = useAccent();
  const progress = units.find((u) => u.unit === unit);
  if (!progress) return <NotFound />;
  const kind = deckKind(deck.slug);
  const noun = ITEM_NOUN[kind];
  const step = hasTopics(kind) ? "Chủ đề" : "Unit";

  const index = units.findIndex((u) => u.unit === unit);
  const previous = units[index - 1];
  const next = units[index + 1];
  const newWords = progress.total - progress.studied;
  const canLearn = Math.min(newWords, quota.remaining);
  const percent = progress.total > 0 ? (progress.studied / progress.total) * 100 : 0;
  const plants = list.rows.reduce<Record<CardStatus, number>>(
    (acc, card) => ({ ...acc, [cardStatus(card)]: acc[cardStatus(card)] + 1 }),
    { new: 0, learning: 0, young: 0, mature: 0 },
  );

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-6 bg-gradient-to-br from-[#2f86f6] via-primary to-primary-edge px-4 pb-6 pt-5 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:px-8 sm:py-7">
        <Link href={`/${deck.slug}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
          <ChevronLeftIcon className="size-4" />
          {deck.name}
        </Link>
        <div className="grid gap-6 md:grid-cols-[1fr_20rem] md:items-end">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{unitTitle(deck.slug, unit)}</h1>
            <div className="space-y-3 rounded-2xl bg-white p-4 text-foreground">
              <div className="flex items-baseline justify-between text-sm">
                <span>
                  <b className="text-base tabular-nums">{progress.studied}</b>
                  <span className="text-muted-foreground">/{progress.total} {noun} đã học</span>
                </span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(percent)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-plant-grown" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold tabular-nums">
                {(["new", "learning", "young", "mature"] as const).map((status) => (
                  <span key={status} className="flex items-center gap-1">
                    <PlantIcon status={status} className="size-4" />
                    {plants[status]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl bg-navy-soft p-4">
            <p className="text-sm text-white/90">
              {progress.due} thẻ cần ôn, {newWords} {noun} chưa học
            </p>
            <div className="grid gap-2">
              {progress.due > 0 && (
                <Button asChild size="lg" variant="light">
                  <Link href={`/${deck.slug}/review?unit=${unit}`}>
                    <RotateCcwIcon />
                    Ôn {progress.due} thẻ
                  </Link>
                </Button>
              )}
              {newWords > 0 ? (
                <Button asChild size="lg" variant={progress.due > 0 ? "blue" : "light"}>
                  <Link href={`/${deck.slug}/learn?unit=${unit}`}>
                    <BookOpenIcon />
                    {canLearn > 0 ? `Học ${canLearn} ${noun} mới` : `Học ${noun} mới`}
                  </Link>
                </Button>
              ) : (
                <p className="text-sm font-semibold">Đã học hết {step.toLowerCase()} này. Luyện tập bên dưới để nhớ lâu hơn.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <PracticePanel
        slug={deck.slug}
        unit={unit}
        unitLabel={unitLabels(kind)?.[unit] ?? `Unit ${unit}`}
        noun={noun}
        modes={modesFor(kind)}
        counts={practiceCounts}
        sizes={roundSizes(kind)}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          {noun[0].toUpperCase()}
          {noun.slice(1)} trong {step.toLowerCase()} ({list.total})
        </h2>
        <CardTable cards={list.rows} deckSlug={deck.slug} accent={accent} />
      </section>

      <nav className="flex items-center justify-between gap-2">
        {previous ? (
          <Button asChild variant="outline">
            <Link href={`/${deck.slug}/unit/${previous.unit}`}>
              <ChevronLeftIcon />
              {step} {previous.unit}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button asChild variant="outline">
            <Link href={`/${deck.slug}/unit/${next.unit}`}>
              {step} {next.unit}
              <ChevronRightIcon />
            </Link>
          </Button>
        )}
      </nav>
      <DeckCredit kind={kind} />
    </div>
  );
}

export function UnitPage() {
  const { deck: slug, unit: raw } = useParams();
  const unit = parseUnit(raw);
  if (!unit) return <NotFound />;
  return (
    <DataPage dataKey={`unit:${slug}:${unit}`} load={() => api.unitPage(slug!, String(unit))} fallback={<Loading />} notFound={<NotFound />}>
      {(data) => <Content unit={unit} data={data} />}
    </DataPage>
  );
}
