import { BookOpenIcon, ChevronLeftIcon, FileUpIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { useAccent } from "@/components/accent-provider";
import { CardFilters } from "@/components/card-filters";
import { CardTable } from "@/components/card-table";
import { CourseProgress, PlantCounts } from "@/components/course-card";
import { DeckCredit } from "@/components/deck-credit";
import { IpaAccentNote } from "@/components/ipa-accent-note";
import { Pagination } from "@/components/pagination";
import { PracticePanel } from "@/components/practice/practice-panel";
import { UnitGrid } from "@/components/unit-grid";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ITEM_NOUN, deckKind, hasTopics, unitLabels, unitName } from "@/lib/deck-kind";
import { modesFor, practiceCounts as roundSizes } from "@/lib/practice";
import { Link, useParams } from "@/lib/router";
import { CARD_STATUS_LABELS, parseUnit, type CardStatus } from "@/lib/study";
import { CARDS_PAGE_SIZE, type DeckPageData } from "@/lib/types";
import { DataPage } from "@/lib/use-data";
import { Loading } from "@/pages/loading";
import { NotFound } from "@/pages/not-found";

function Content({ data: { deck, summary, units, quota, list, practiceCounts } }: { data: DeckPageData }) {
  const [query] = useSearchParams();
  const accent = useAccent();
  const unit = parseUnit(query.get("unit") ?? undefined);
  const q = (query.get("q") ?? "").trim().slice(0, 100);
  const rawStatus = query.get("status");
  const status = rawStatus && rawStatus in CARD_STATUS_LABELS ? (rawStatus as CardStatus) : null;
  const page = Math.max(1, Number.parseInt(query.get("page") ?? "1", 10) || 1);

  const kind = deckKind(deck.slug);
  const noun = ITEM_NOUN[kind];
  const scoped = unit ? units.find((u) => u.unit === unit) : null;
  const dueInScope = scoped ? scoped.due : summary.due;
  const newInScope = scoped ? scoped.total - scoped.studied : summary.newCount;
  const canLearn = Math.min(newInScope, quota.remaining);
  const suffix = unit ? `?unit=${unit}` : "";
  const scopeLabel = unit ? unitName(kind, unit) : "Cả khoá";

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-6 bg-gradient-to-br from-[#2f86f6] via-primary to-primary-edge px-4 pb-6 pt-5 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:px-8 sm:py-7">
        <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
          <ChevronLeftIcon className="size-4" />
          Trang chủ
        </Link>
        <div className="grid gap-6 md:grid-cols-[1fr_20rem] md:items-end">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{deck.name}</h1>
            <div className="rounded-2xl bg-white p-4 text-foreground">
              <CourseProgress deck={summary} />
              <div className="mt-3">
                <PlantCounts deck={summary} />
              </div>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl bg-navy-soft p-4">
            <p className="text-sm">
              <b>{scopeLabel}:</b> <span className="text-white/90">{dueInScope} cần ôn, {newInScope} {noun} chưa học</span>
            </p>
            <div className="grid gap-2">
              {dueInScope > 0 && (
                <Button asChild size="lg" variant="light">
                  <Link href={`/${deck.slug}/review${suffix}`}>
                    <RotateCcwIcon />
                    Ôn {dueInScope} thẻ
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant={dueInScope > 0 ? "blue" : "light"}>
                <Link href={`/${deck.slug}/learn${suffix}`}>
                  <BookOpenIcon />
                  {canLearn > 0 ? `Học ${canLearn} ${noun} mới` : `Học ${noun} mới`}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {kind === "sound" && <IpaAccentNote />}

      <PracticePanel
        slug={deck.slug}
        unit={unit}
        unitLabel={unit ? scopeLabel : null}
        noun={noun}
        modes={modesFor(kind)}
        counts={practiceCounts}
        sizes={roundSizes(kind)}
      />

      {units.length > 0 && <UnitGrid slug={deck.slug} units={units} active={unit} labels={unitLabels(kind)} noun={noun} topics={hasTopics(kind)} />}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{unit ? `${noun[0].toUpperCase()}${noun.slice(1)} trong ${scopeLabel}` : `Tất cả ${noun}`}</h2>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${deck.slug}/new`}>
                <PlusIcon />
                Thêm thẻ
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${deck.slug}/import`}>
                <FileUpIcon />
                Nhập nhiều
              </Link>
            </Button>
          </div>
        </div>
        <CardFilters q={q} status={status} total={list.total} />
        <CardTable cards={list.rows} deckSlug={deck.slug} accent={accent} />
        <Pagination page={page} pageSize={CARDS_PAGE_SIZE} total={list.total} />
      </section>

      <DeckCredit kind={kind} />
    </div>
  );
}

export function DeckPage() {
  const slug = useParams().deck!;
  const [params] = useSearchParams();
  return (
    <DataPage
      dataKey={`deck-page:${slug}:${params.toString()}`}
      group={`deck-page:${slug}`}
      load={() => api.deckPage(slug, params)}
      fallback={<Loading />}
      notFound={<NotFound />}
    >
      {(data) => <Content data={data} />}
    </DataPage>
  );
}
