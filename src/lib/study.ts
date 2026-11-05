// Shared, client-safe study vocabulary: card status, filters and settings.
import type { CardType } from "@/lib/card-types";

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  writing: "Writing",
  speaking: "Speaking",
  idiom: "Idiom",
  sound: "Phát âm",
  sentence: "Câu",
  passage: "Đoạn văn",
};

export type CardStatus = "new" | "learning" | "young" | "mature";

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  new: "Mới",
  learning: "Đang học",
  young: "Đang ôn",
  mature: "Đã thuộc",
};

/** Anki's threshold: a card reviewed at 21+ day intervals counts as learned. */
export const MATURE_INTERVAL_DAYS = 21;

export function cardStatus(card: { dueAt: string | null; intervalDays: number }): CardStatus {
  if (card.dueAt === null) return "new";
  if (card.intervalDays === 0) return "learning";
  return card.intervalDays >= MATURE_INTERVAL_DAYS ? "mature" : "young";
}

/**
 * New cards a day are counted per kind, so learning sentences never uses up
 * the day's new words. Each kind has its own limit and its own choices.
 */
export const NEW_BUCKETS = ["words", "sound", "sentence", "passage"] as const;
export type NewBucket = (typeof NEW_BUCKETS)[number];

export const NEW_BUCKET_INFO: Record<
  NewBucket,
  { label: string; noun: string; types: readonly CardType[]; limits: readonly number[]; fallback: number }
> = {
  words: { label: "Từ", noun: "từ", types: ["vocab", "idiom", "grammar", "writing", "speaking"], limits: [10, 15, 20], fallback: 10 },
  sound: { label: "Âm IPA", noun: "âm", types: ["sound"], limits: [3, 5, 10], fallback: 5 },
  sentence: { label: "Câu", noun: "câu", types: ["sentence"], limits: [5, 10, 15, 20], fallback: 10 },
  passage: { label: "Đoạn", noun: "đoạn", types: ["passage"], limits: [1, 2, 3, 5], fallback: 2 },
};

export function bucketOfType(type: CardType): NewBucket {
  return NEW_BUCKETS.find((bucket) => NEW_BUCKET_INFO[bucket].types.includes(type)) ?? "words";
}

export function isNewLimit(bucket: NewBucket, value: unknown): value is number {
  return NEW_BUCKET_INFO[bucket].limits.includes(value as number);
}

/** Card as the study screen needs it. */
export type StudyCard = {
  id: number;
  deckSlug: string;
  type: CardType;
  front: string;
  back: string;
  ipa: string | null;
  ipaUk: string | null;
  example: string | null;
  exampleVi: string | null;
  note: string | null;
  tags: string[];
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string | null;
};

export function unitFromTags(tags: readonly string[]): number | null {
  for (const tag of tags) {
    const match = /^unit-(\d{2})$/.exec(tag);
    if (match) return Number(match[1]);
  }
  return null;
}

export function unitTag(unit: number) {
  return `unit-${String(unit).padStart(2, "0")}`;
}

/** Parses `?unit=5` defensively; anything else means "all units". */
export function parseUnit(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{1,2}$/.test(raw)) return null;
  const unit = Number(raw);
  return unit >= 1 && unit <= 99 ? unit : null;
}

// Top-level routes a deck slug must not shadow.
export const RESERVED_SLUGS = ["login", "review", "learn", "decks", "new", "import", "api", "_next"];

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
