// Shapes the API returns. The browser and the Worker both use these.
import type { CardType } from "@/lib/card-types";
import type { Accent } from "@/lib/accent";
import type { CardSchedule } from "@/lib/srs";
import type { NewBucket, StudyCard } from "@/lib/study";
import type { QuizQuestion } from "@/lib/practice";

export { CARD_TYPES, type CardType } from "@/lib/card-types";

export const CARDS_PAGE_SIZE = 50;

export type Deck = { id: number; slug: string; name: string; position: number };

export type Card = {
  id: number;
  deckId: number;
  type: CardType;
  front: string;
  back: string;
  ipa: string | null;
  ipaUk: string | null;
  example: string | null;
  exampleVi: string | null;
  note: string | null;
  tags: string[];
  position: number;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string | null;
  introducedOn: string | null;
};

export type DeckSummary = { id: number; slug: string; name: string; total: number; newCount: number; learning: number; due: number; mature: number };
export type UnitProgress = { unit: number; total: number; studied: number; due: number };
export type NewQuota = { bucket: NewBucket; limit: number; learned: number; remaining: number };
export type StudyScope = { deckId?: number; unit?: number | null };
export type PracticeCounts = { all: number; learned: number };

export type Dashboard = {
  today: string;
  decks: DeckSummary[];
  due: number;
  quotas: Record<NewBucket, NewQuota>;
  streak: number;
  reviewedToday: number;
  forecast: { day: string; due: number }[];
};

export type DeckPageData = {
  deck: Deck;
  summary: DeckSummary;
  units: UnitProgress[];
  quota: NewQuota;
  list: { rows: Card[]; total: number };
  practiceCounts: PracticeCounts;
};

export type UnitPageData = Omit<DeckPageData, "summary">;

export type StudyPageData = { deck: Deck; cards: StudyCard[]; quota: NewQuota; due: number };

export type PracticePageData = { deck: Deck; cards: StudyCard[]; quiz: Record<number, QuizQuestion>; glossary: Record<string, string> };

export type Me = { accent: Accent };
export type AnswerResult = { ok: true; reviewId: number; card: CardSchedule } | { ok: false; error: string };
export type UndoResult = { ok: true; card: CardSchedule } | { ok: false; error: string };
