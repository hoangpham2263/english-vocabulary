
import {
  ArrowDownUpIcon,
  BookOpenTextIcon,
  EarIcon,
  HeadphonesIcon,
  LanguagesIcon,
  LayersIcon,
  ListChecksIcon,
  MicIcon,
  PencilLineIcon,
  SquareDashedIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/lib/router";
import { useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  ENDLESS_PRACTICE,
  PRACTICE_COUNTS,
  PRACTICE_MODE_LABELS,
  type PracticeMode,
  type PracticeSource,
} from "@/lib/practice";

const ICONS: Record<PracticeMode, LucideIcon> = {
  flashcard: LayersIcon,
  quiz: ListChecksIcon,
  spell: PencilLineIcon,
  translate: LanguagesIcon,
  listen: HeadphonesIcon,
  read: BookOpenTextIcon,
  order: ArrowDownUpIcon,
  cloze: SquareDashedIcon,
  toEn: TypeIcon,
  toVi: LanguagesIcon,
  dictation: EarIcon,
  speak: MicIcon,
};

export function PracticePanel({
  slug,
  unit,
  unitLabel = null,
  noun = "từ",
  modes,
  counts,
  sizes = PRACTICE_COUNTS,
}: {
  slug: string;
  unit: number | null;
  /** How the scoped unit is named: "Unit 3", or a topic. */
  unitLabel?: string | null;
  /** What a card is called in counts: "từ", "câu". */
  noun?: string;
  modes: PracticeMode[];
  counts: { learned: number; all: number };
  /** Round sizes to offer; the middle one is the default. */
  sizes?: readonly number[];
}) {
  const [source, setSource] = useState<PracticeSource>(counts.learned > 0 ? "learned" : "all");
  const [count, setCount] = useState<number>(sizes[Math.floor((sizes.length - 1) / 2)]);
  const available = source === "learned" ? counts.learned : counts.all;

  const href = (mode: PracticeMode) => {
    const params = new URLSearchParams({ mode, source, count: String(count) });
    if (unit) params.set("unit", String(unit));
    return `/${slug}/practice?${params}`;
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Luyện tập {unit ? (unitLabel ?? `Unit ${unit}`) : "cả sách"}</h2>
          <p className="text-sm text-muted-foreground">Bốc ngẫu nhiên, không làm thay đổi lịch ôn</p>
        </div>
        <div className="flex gap-2">
          <NativeSelect
            aria-label="Phạm vi"
            containerClassName="w-auto"
            className="h-10"
            value={source}
            onChange={(event) => setSource(event.target.value as PracticeSource)}
          >
            {(["learned", "all"] as const).map((value) => (
              <option key={value} value={value}>
                {value === "learned" ? `${noun[0].toUpperCase()}${noun.slice(1)} đã học` : `Tất cả ${noun}`} ({value === "learned" ? counts.learned : counts.all})
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Số từ"
            containerClassName="w-auto"
            className="h-10"
            value={String(count)}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {sizes.map((value) => (
              <option key={value} value={value}>
                {value} {noun}
              </option>
            ))}
            <option value={ENDLESS_PRACTICE}>Vô hạn</option>
          </NativeSelect>
        </div>
      </div>

      {available === 0 && (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          {source === "learned"
            ? `Chưa có ${noun} nào đã học ở phạm vi này. Học vài ${noun} mới trước, hoặc chọn "Tất cả ${noun}".`
            : "Phạm vi này chưa có thẻ nào."}
        </p>
      )}

      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", modes.length > 6 ? "lg:grid-cols-4" : "lg:grid-cols-6")}>
        {modes.map((mode) => {
          const Icon = ICONS[mode];
          return (
            <Link
              key={mode}
              href={href(mode)}
              aria-disabled={available === 0}
              className={
                "group space-y-2 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent " +
                (available === 0 ? "pointer-events-none opacity-50" : "")
              }
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary-edge">
                <Icon className="size-5" />
              </span>
              <p className="font-bold">{PRACTICE_MODE_LABELS[mode].title}</p>
              <p className="text-xs leading-snug text-muted-foreground">{PRACTICE_MODE_LABELS[mode].hint}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
