import { CheckIcon } from "lucide-react";
import { Link } from "@/lib/router";
import type { UnitProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

// Units as Memrise "levels": numbered tiles that fill up as their words are learned.
export function UnitGrid({
  slug,
  units,
  active,
  labels,
  noun = "từ",
  topics = false,
}: {
  slug: string;
  units: UnitProgress[];
  active: number | null;
  /** Names instead of numbers, for decks whose units are topics (the IPA chart). */
  labels?: Record<number, string>;
  noun?: string;
  /** Units are topics ("Chủ đề") rather than numbered lessons. */
  topics?: boolean;
}) {
  const step = topics ? "Chủ đề" : "Unit";
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Các {step.toLowerCase()}</h2>
        {active && (
          <Link href={`/${slug}`} className="text-sm font-semibold text-primary hover:underline">
            Bỏ lọc {step.toLowerCase()}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
        {units.map((u) => {
          const percent = u.total > 0 ? (u.studied / u.total) * 100 : 0;
          const done = u.studied === u.total;
          const isActive = active === u.unit;
          return (
            <Link
              key={u.unit}
              href={`/${slug}/unit/${u.unit}`}
              title={`${step} ${u.unit}: đã học ${u.studied}/${u.total}, ${u.due} thẻ cần ôn`}
              className={cn(
                "group relative flex flex-col gap-2 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40",
                isActive && "border-primary bg-accent",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step} {labels ? u.unit : ""}</span>
                {done ? (
                  <span className="grid size-5 place-items-center rounded-full bg-plant-grown text-white">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                ) : u.due > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{u.due}</span>
                ) : null}
              </div>
              {labels?.[u.unit] ? (
                <p className="flex-1 text-sm font-bold leading-tight">{labels[u.unit]}</p>
              ) : (
                <p className="flex-1 text-2xl font-bold tabular-nums leading-none">{u.unit}</p>
              )}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-plant-grown" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {u.studied}/{u.total} {noun}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
