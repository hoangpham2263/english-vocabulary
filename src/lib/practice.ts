// Practice modes: drills that never change the SM-2 schedule. Pure helpers,
// shared by the server page and the client session.

export const PRACTICE_MODES = [
  "flashcard",
  "quiz",
  "spell",
  "translate",
  "listen",
  "read",
  "order",
  "cloze",
  "toEn",
  "toVi",
  "dictation",
  "speak",
] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const PRACTICE_MODE_LABELS: Record<PracticeMode, { title: string; hint: string }> = {
  flashcard: { title: "Flashcard", hint: "Lật thẻ, tự đánh giá nhớ hay chưa" },
  quiz: { title: "Trắc nghiệm", hint: "Chọn nghĩa đúng, hoặc chọn từ đúng theo nghĩa" },
  spell: { title: "Viết tiếng Anh", hint: "Xem nghĩa tiếng Việt, gõ từ tiếng Anh" },
  translate: { title: "Viết tiếng Việt", hint: "Xem từ tiếng Anh, gõ nghĩa tiếng Việt" },
  listen: { title: "Nghe và viết", hint: "Nghe máy đọc, gõ lại từ" },
  read: { title: "Đọc hiểu", hint: "Đọc câu, bấm từ để xem nghĩa, nghe máy đọc từng từ" },
  order: { title: "Sắp xếp câu", hint: "Xếp các từ thành câu tiếng Anh theo nghĩa tiếng Việt" },
  cloze: { title: "Điền từ", hint: "Gõ từ còn thiếu trong câu" },
  toEn: { title: "Dịch sang tiếng Anh", hint: "Xem câu tiếng Việt, gõ câu tiếng Anh" },
  toVi: { title: "Dịch sang tiếng Việt", hint: "Đọc câu tiếng Anh, gõ bản dịch" },
  dictation: { title: "Nghe chép câu", hint: "Nghe cả câu, gõ lại từng từ" },
  speak: { title: "Luyện phát âm", hint: "Đọc to, máy nghe và chấm" },
};

/**
 * The drills each kind of deck offers: typing needs a spelling (the IPA chart
 * has symbols), and sentences get reading and translation drills instead of
 * the word drills.
 */
export function modesFor(kind: "words" | "sound" | "sentence" | "passage"): PracticeMode[] {
  if (kind === "sound") return ["flashcard", "quiz", "speak"];
  if (kind === "sentence") return ["read", "order", "cloze", "toEn", "toVi", "dictation", "speak"];
  // A passage is worked through sentence by sentence; a cloze of one word per passage is too little.
  if (kind === "passage") return ["read", "order", "toEn", "toVi", "dictation", "speak"];
  return ["flashcard", "quiz", "spell", "translate", "listen", "speak"];
}

export const PRACTICE_SOURCES = ["learned", "all"] as const;
export type PracticeSource = (typeof PRACTICE_SOURCES)[number];
export const PRACTICE_SOURCE_LABELS: Record<PracticeSource, string> = {
  learned: "Từ đã học",
  all: "Tất cả từ",
};

export const PRACTICE_COUNTS = [10, 20, 30, 50] as const;
export const DEFAULT_PRACTICE_COUNT = 20;
/** A passage holds several sentences, so a round is a few passages. */
export const PASSAGE_PRACTICE_COUNTS = [1, 3, 5] as const;
export const DEFAULT_PASSAGE_PRACTICE_COUNT = 3;

export function practiceCounts(kind: string): readonly number[] {
  return kind === "passage" ? PASSAGE_PRACTICE_COUNTS : PRACTICE_COUNTS;
}

/**
 * The "count" that means an endless round: the drawn cards are shuffled and
 * gone through again pass after pass until the learner stops.
 */
export const ENDLESS_PRACTICE = 0;

/** How many cards an endless round draws to cycle through; a unit fits whole. */
export function endlessDraw(kind: string): number {
  return kind === "passage" ? 30 : 200;
}

export function defaultPracticeCount(kind: string): number {
  return kind === "passage" ? DEFAULT_PASSAGE_PRACTICE_COUNT : DEFAULT_PRACTICE_COUNT;
}

/** A wrong card comes back this many more times at most in one session. */
export const MAX_RETRIES = 2;

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectSpelling(typed: string, target: string): boolean {
  const a = normalizeAnswer(typed);
  return a.length > 0 && a === normalizeAnswer(target);
}

/** Lowercase, no Vietnamese tone marks or đ, single spaces: "Lo Sợ " → "lo so". */
export function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The separate senses of a meaning: "sợ, lo sợ; khiếp (cổ)" → ["sợ", "lo sợ", "khiếp"]. */
export function meaningOptions(back: string): string[] {
  return back
    .replace(/\([^)]*\)/g, " ")
    .split(/[,;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * A typed Vietnamese meaning is right when it matches any one sense, ignoring
 * tone marks, case and a small typo (one edit per six letters).
 */
export function isCorrectMeaning(typed: string, back: string): boolean {
  const answer = foldVietnamese(typed);
  if (!answer) return false;
  return meaningOptions(back).some((option) => {
    const target = foldVietnamese(option);
    if (!target) return false;
    if (answer === target) return true;
    return levenshtein(answer, target) <= Math.max(1, Math.floor(target.length / 6));
  });
}

/**
 * One sense typed out in full (tone marks optional). Safe to accept while the
 * learner is still typing, unlike the typo-tolerant check, which would fire a
 * letter early on "thong min".
 */
export function isExactMeaning(typed: string, back: string): boolean {
  const answer = foldVietnamese(typed);
  return answer.length > 0 && meaningOptions(back).some((option) => foldVietnamese(option) === answer);
}

export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/** How one typed character lines up against the answer. "missing" hides the letter it stands for. */
export type CharMark =
  | { kind: "ok" | "wrong" | "extra" | "typed"; char: string }
  | { kind: "missing"; space?: boolean };

/** One character as the checker sees it: lowercase, straight quote, and no tone marks when folded. */
function charKey(char: string, fold: boolean): string {
  const lower = char.toLowerCase().replace(/[’‘`]/, "'");
  return fold ? foldVietnamese(lower) || lower : lower;
}

/**
 * Checks the typed answer against the target position by position, left to
 * right as it was typed: the third letter typed is only ever compared with the
 * third letter of the answer. Slots past what was typed stay empty and never
 * show the letter they stand for.
 */
export function markAnswer(typed: string, target: string, fold = false): CharMark[] {
  const a = [...typed.trim()];
  const b = [...target.trim()];
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i): CharMark => {
    if (i >= a.length) return { kind: "missing", space: b[i] === " " };
    if (i >= b.length) return { kind: "extra", char: a[i] };
    return { kind: charKey(a[i], fold) === charKey(b[i], fold) ? "ok" : "wrong", char: a[i] };
  });
}

/**
 * Before the first check: one empty slot per letter of the answer, filled in
 * as the learner types, without saying yet which letters are right.
 */
export function slotAnswer(typed: string, target: string): CharMark[] {
  const a = [...typed.trimStart()];
  const b = [...target.trim()];
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i): CharMark =>
    i < a.length ? { kind: "typed", char: a[i] } : { kind: "missing", space: b[i] === " " },
  );
}

/** The sense of a Vietnamese meaning that a typed answer is closest to. */
export function closestMeaning(typed: string, back: string): string {
  const options = meaningOptions(back);
  const answer = foldVietnamese(typed);
  let best = options[0] ?? back;
  let bestDistance = Infinity;
  for (const option of options) {
    const distance = levenshtein(answer, foldVietnamese(option));
    if (distance < bestDistance) [best, bestDistance] = [option, distance];
  }
  return best;
}

/** The answer with the first wrong or missing letter put right, and everything after it dropped. */
export function hintFrom(typed: string, target: string, fold = false): string {
  const a = [...typed.trim()];
  const b = [...target.trim()];
  let n = 0;
  while (n < a.length && n < b.length && charKey(a[n], fold) === charKey(b[n], fold)) n += 1;
  return b.slice(0, Math.min(n + 1, b.length)).join("");
}

/** 0..1, how close what the recogniser heard is to the target word. */
export function similarity(heard: string, target: string): number {
  const a = normalizeAnswer(heard);
  const b = normalizeAnswer(target);
  if (!a || !b) return 0;
  if (a === b || a.split(" ").includes(b)) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export const PRONUNCIATION_PASS = 0.8;

/** Best score over every alternative the recogniser offered. */
export function scorePronunciation(alternatives: readonly string[], target: string) {
  let best = { heard: alternatives[0] ?? "", score: 0 };
  for (const heard of alternatives) {
    const score = similarity(heard, target);
    if (score > best.score) best = { heard, score };
  }
  return { ...best, passed: best.score >= PRONUNCIATION_PASS };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Hides the word in its example so the sentence can be a clue without being
 * the answer. Covers inflected forms that start with the word (attack →
 * attacked), and a stem for words ending in e/y (arrive → arrived, carry → carried).
 */
export function blankOut(sentence: string, word: string): string {
  const base = word.trim();
  if (!base) return sentence;
  const stem = base.length > 3 && /[ey]$/i.test(base) ? base.slice(0, -1) : base;
  const pattern = new RegExp(`\\b${escapeRegExp(stem)}[\\p{L}']*`, "giu");
  return sentence.replace(pattern, (match) => "_".repeat(Math.max(3, Math.min(match.length, 10))));
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Four options: the right one plus three different wrong ones, in random order. */
export function quizOptions(correct: string, pool: readonly string[], random: () => number = Math.random, size = 4): string[] {
  const key = normalizeAnswer(correct);
  const seen = new Set([key]);
  const wrong: string[] = [];
  for (const option of shuffle(pool, random)) {
    const k = normalizeAnswer(option);
    if (seen.has(k)) continue;
    seen.add(k);
    wrong.push(option);
    if (wrong.length === size - 1) break;
  }
  return shuffle([correct, ...wrong], random);
}

/**
 * The key word a sound card is heard through. Browser speech cannot voice a
 * phoneme on its own (it spells out IPA symbols and letter names), so a sound
 * card is always heard inside its first example word.
 */
export function keyWord(card: { type: string; front: string; example: string | null }): string {
  if (card.type === "sound") return (card.example ?? "").split(",")[0]?.trim() ?? "";
  return card.front;
}

/** What the main Listen button reads: the word, or a sound card's key word. */
export function spokenText(card: { type: string; front: string; example: string | null }): string {
  return keyWord(card);
}

/** The word a learner says aloud in the pronunciation drill. */
export function sayTarget(card: { type: string; front: string; example: string | null }): string {
  return keyWord(card);
}

export type QuizQuestion = { reverse: boolean; options: string[] };

/**
 * Decided once on the server, so the page renders the same question in the
 * browser as it did on the server: random choices made during render on both
 * sides would differ and break hydration.
 */
export function planQuiz(
  cards: readonly { id: number; front: string; back: string }[],
  pool: readonly { front: string; back: string }[],
  random: () => number = Math.random,
): Record<number, QuizQuestion> {
  const plan: Record<number, QuizQuestion> = {};
  for (const card of cards) {
    const reverse = random() < 0.5;
    const correct = reverse ? card.front : card.back;
    const choices = pool.map((entry) => (reverse ? entry.front : entry.back));
    plan[card.id] = { reverse, options: quizOptions(correct, choices, random) };
  }
  return plan;
}
