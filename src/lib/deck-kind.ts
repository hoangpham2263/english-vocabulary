// The three kinds of deck: word books, the IPA chart and the translation
// sentences. Each has its own practice modes, unit names and counting noun.

import { IPA_DECK, IPA_UNITS } from "../../scripts/ipa-format.mjs";
import { PASSAGE_DECK, PASSAGE_TOPICS } from "../../scripts/passage-format.mjs";
import { SENTENCE_DECK, SENTENCE_TOPICS } from "../../scripts/sentence-format.mjs";
import { unitFromTags, type NewBucket } from "@/lib/study";

export type DeckKind = "words" | "sound" | "sentence" | "passage";

export function deckKind(slug: string): DeckKind {
  if (slug === IPA_DECK.slug) return "sound";
  if (slug === SENTENCE_DECK.slug) return "sentence";
  if (slug === PASSAGE_DECK.slug) return "passage";
  return "words";
}

/** Unit names for decks whose units are topics; numbered units otherwise. */
export function unitLabels(kind: DeckKind): Record<number, string> | undefined {
  if (kind === "sound") return IPA_UNITS;
  if (kind === "sentence") return SENTENCE_TOPICS;
  if (kind === "passage") return PASSAGE_TOPICS;
  return undefined;
}

export function unitName(kind: DeckKind, unit: number): string {
  return unitLabels(kind)?.[unit] ?? `Unit ${unit}`;
}

/** The unit of a card as the learner sees it: "Unit 3", or a topic name. */
export function cardUnitName(card: { type: string; tags: string[] }): string | null {
  const unit = unitFromTags(card.tags);
  if (!unit) return null;
  const kind: DeckKind =
    card.type === "sentence" || card.type === "passage" || card.type === "sound" ? card.type : "words";
  return unitName(kind, unit);
}

/** What one card is called in counts: "20 từ", "20 câu". */
export const ITEM_NOUN: Record<DeckKind, string> = { words: "từ", sound: "âm", sentence: "câu", passage: "đoạn" };

/** Decks whose units are topics rather than numbered lessons. */
export function hasTopics(kind: DeckKind) {
  return kind === "sentence" || kind === "passage";
}

export type DeckGroup = { key: string; title: string; description: string };

/** How the home page groups the courses, in this order. */
export const DECK_GROUPS: DeckGroup[] = [
  { key: "sound", title: "Phát âm", description: "44 âm IPA giọng Mỹ và Anh, nghe từng âm và luyện đọc" },
  { key: "words", title: "Từ vựng", description: "4000 Essential English Words, 6 sách, học theo unit" },
  { key: "translate", title: "Luyện dịch", description: "Câu và đoạn văn Anh–Việt theo chủ đề, đọc hiểu và dịch hai chiều" },
  { key: "own", title: "Bộ thẻ tự tạo", description: "Các bộ thẻ bạn tự thêm" },
];

export function deckGroup(slug: string): DeckGroup["key"] {
  const kind = deckKind(slug);
  if (kind === "sound") return "sound";
  if (kind === "sentence" || kind === "passage") return "translate";
  return /^4000-book\d+$/.test(slug) ? "words" : "own";
}

/** Which daily new-card quota a course draws on. */
export function deckBucket(slug: string): NewBucket {
  const kind = deckKind(slug);
  return kind === "sound" || kind === "sentence" || kind === "passage" ? kind : "words";
}
