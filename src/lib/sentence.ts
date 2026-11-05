// Sentence drills (the "Luyện dịch câu" deck): pure helpers shared by the
// server page and the client drills.

import { foldVietnamese, normalizeAnswer } from "@/lib/practice";

/** The words of a sentence as written, punctuation attached: "Are you hungry?" → ["Are", "you", "hungry?"]. */
export function chunks(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

/** A word as the checker compares it: "Hungry?" → "hungry", "Don’t" → "don't". */
export function wordKey(word: string): string {
  return normalizeAnswer(word).replace(/^'+|'+$/g, "").replace(/\s+/g, "");
}

/** The compared words of a sentence, punctuation dropped. */
export function wordKeys(sentence: string): string[] {
  return chunks(sentence).map(wordKey).filter(Boolean);
}

/** Right when every word matches in order; case and punctuation do not count. */
export function sentenceMatches(typed: string, reference: string): boolean {
  const a = wordKeys(typed);
  const b = wordKeys(reference);
  return a.length > 0 && a.length === b.length && a.every((word, i) => word === b[i]);
}

/** Forms a dictionary might list a word under: "studies" → studies, study; "running" → running, runn, run. */
export function lookupForms(word: string): string[] {
  const w = wordKey(word).replace(/'s$/, "");
  if (!w) return [];
  const forms = [w];
  const add = (form: string) => form.length >= 2 && !forms.includes(form) && forms.push(form);
  if (w.endsWith("ies")) add(`${w.slice(0, -3)}y`);
  if (w.endsWith("es")) add(w.slice(0, -2));
  if (w.endsWith("s")) add(w.slice(0, -1));
  if (w.endsWith("ied")) add(`${w.slice(0, -3)}y`);
  if (w.endsWith("ed")) {
    add(w.slice(0, -2));
    add(w.slice(0, -1));
    if (/(.)\1ed$/.test(w)) add(w.slice(0, -3));
  }
  if (w.endsWith("ing")) {
    add(w.slice(0, -3));
    add(`${w.slice(0, -3)}e`);
    if (/(.)\1ing$/.test(w)) add(w.slice(0, -4));
  }
  if (w.endsWith("er")) add(w.slice(0, -2));
  if (w.endsWith("est")) add(w.slice(0, -3));
  if (w.endsWith("ly")) add(w.slice(0, -2));
  return forms;
}

/** Every form worth looking up for a set of sentences. */
export function lookupWords(sentences: readonly string[]): string[] {
  return [...new Set(sentences.flatMap((s) => chunks(s).flatMap(lookupForms)))];
}

export type Glossary = Record<string, string>;

/** A passage card's sentence pairs: one sentence per line on each side. */
export function passagePairs(card: { front: string; back: string }): { en: string; vi: string }[] {
  const en = card.front.split("\n").map((s) => s.trim()).filter(Boolean);
  const vi = card.back.split("\n").map((s) => s.trim()).filter(Boolean);
  return en.map((sentence, i) => ({ en: sentence, vi: vi[i] ?? "" }));
}

/** A card's text as one paragraph: a passage's lines joined, anything else as is. */
export function asParagraph(text: string): string {
  return text.split("\n").map((s) => s.trim()).filter(Boolean).join(" ");
}

/** The meaning of a word as written in a sentence, through its dictionary form. */
export function lookup(glossary: Glossary, word: string): { form: string; meaning: string } | null {
  for (const form of lookupForms(word)) {
    if (glossary[form]) return { form, meaning: glossary[form] };
  }
  return null;
}

const SMALL_WORDS = new Set(
  "the a an and or but if of to in on at by for with from into about as is are was were be been being am do does did have has had will would can could should must may might shall this that these those there their they them then than what which who whom whose when where why how not don't doesn't didn't i'm it's you're he's she's we're they're very just also".split(
    " ",
  ),
);

/**
 * The word to blank in the cloze drill: the longest word that is not a small
 * function word, the first one on a tie. Deterministic, so the server render
 * and the browser agree.
 */
export function clozeWord(sentence: string): { index: number; word: string } {
  const words = chunks(sentence);
  let best = { index: 0, word: wordKey(words[0] ?? "") };
  let bestLength = -1;
  words.forEach((chunk, index) => {
    const key = wordKey(chunk);
    if (!/^[a-z']+$/.test(key) || SMALL_WORDS.has(key)) return;
    if (key.length > bestLength) {
      best = { index, word: chunk.replace(/^[^\p{L}]+|[^\p{L}']+$/gu, "") };
      bestLength = key.length;
    }
  });
  return best;
}

/** The sentence with the cloze word replaced by a gap. */
export function withGap(sentence: string, index: number, gap = "_____"): string {
  return chunks(sentence)
    .map((chunk, i) => (i === index ? chunk.replace(/[\p{L}']+/u, gap) : chunk))
    .join(" ");
}

export type WordMark =
  | { kind: "ok" | "wrong" | "extra"; text: string }
  | { kind: "missing" };

/**
 * Lines a typed sentence up with the reference word by word (longest common
 * subsequence), so one skipped word does not mark the rest wrong. Missing
 * words become gaps that never show the word they stand for.
 */
export function markWords(typed: string, reference: string): WordMark[] {
  const a = chunks(typed);
  const ka = a.map(wordKey);
  const kb = wordKeys(reference);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(kb.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = kb.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const marks: WordMark[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < kb.length) {
    if (i < a.length && j < kb.length && ka[i] === kb[j]) {
      marks.push({ kind: "ok", text: a[i] });
      i += 1;
      j += 1;
    } else if (i < a.length && j < kb.length && lcs[i + 1][j + 1] === lcs[i][j]) {
      // Neither word is part of the match: one word typed in place of another.
      marks.push({ kind: "wrong", text: a[i] });
      i += 1;
      j += 1;
    } else if (i < a.length && (j >= kb.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      marks.push({ kind: "extra", text: a[i] });
      i += 1;
    } else {
      marks.push({ kind: "missing" });
      j += 1;
    }
  }
  return marks;
}

/** The typed sentence with the first wrong or missing word put right, and what follows dropped. */
export function hintWords(typed: string, reference: string): string {
  const a = wordKeys(typed);
  const ref = chunks(reference);
  let n = 0;
  while (n < a.length && n < ref.length && a[n] === wordKey(ref[n])) n += 1;
  return ref.slice(0, Math.min(n + 1, ref.length)).join(" ");
}

/** 0..1, how much of a Vietnamese translation matches the reference word for word, tone marks ignored. */
export function translationOverlap(typed: string, reference: string): number {
  const a = foldVietnamese(typed).split(" ").filter(Boolean);
  const b = foldVietnamese(reference).split(" ").filter(Boolean);
  if (a.length === 0 || b.length === 0) return 0;
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  return lcs[0][0] / Math.max(a.length, b.length);
}

/** A Vietnamese translation close enough to the reference to count without asking. */
export const TRANSLATION_PASS = 0.85;

const NAMES = new Set(["Tom", "Mary", "John", "Jane", "Ken", "Bill", "Bob", "Jack", "Mike", "Emily", "Alice", "Ziri", "Sami", "Layla"]);

/**
 * How a word shows on a tile in the word-order drill: without the punctuation
 * and the capital letter that would give away where the sentence starts and
 * ends. "I" and names keep their capital.
 */
export function tileLabel(chunk: string, index: number): string {
  const bare = chunk.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "") || chunk;
  if (index !== 0 || /^I($|')/.test(bare) || NAMES.has(bare)) return bare;
  return bare.charAt(0).toLowerCase() + bare.slice(1);
}

/** A shuffle that is the same on the server and in the browser for one card. */
export function seededOrder(length: number, seed: number): number[] {
  let state = (seed * 2654435761) % 4294967296 || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Never hand out the answer already in order.
  if (length > 1 && order.every((value, i) => value === i)) order.push(order.shift()!);
  return order;
}
