import { and, asc, count, eq, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { DEFAULT_ACCENT, isAccent, type Accent } from "../src/lib/accent";
import { addDays, vietnamDay } from "../src/lib/srs";
import {
  MATURE_INTERVAL_DAYS,
  NEW_BUCKETS,
  NEW_BUCKET_INFO,
  isNewLimit,
  unitTag,
  type CardStatus,
  type NewBucket,
  type StudyCard,
} from "../src/lib/study";
import { CARDS_PAGE_SIZE, type Card, type DeckSummary, type NewQuota, type StudyScope, type UnitProgress } from "../src/lib/types";
import { cards, decks, reviews, settings } from "./schema";

export type Db = DrizzleD1Database<Record<string, never>>;

const STUDY_BATCH = 200;
// D1 allows 100 bound parameters in one statement.
const MAX_PARAMS = 90;

// The words limit keeps the key it had before the limits were split.
const newLimitKey = (bucket: NewBucket) => (bucket === "words" ? "daily_new_limit" : `daily_new_limit_${bucket}`);
const ACCENT_KEY = "accent";

const hasUnit = (unit: number) => sql`exists (select 1 from json_each(${cards.tags}) where value = ${unitTag(unit)})`;

export async function getDailyNewLimit(db: Db, bucket: NewBucket): Promise<number> {
  const [row] = await db.select().from(settings).where(eq(settings.key, newLimitKey(bucket)));
  return isNewLimit(bucket, row?.value) ? row.value : NEW_BUCKET_INFO[bucket].fallback;
}

export async function setSetting(db: Db, key: string, value: unknown) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export const setDailyNewLimit = (db: Db, bucket: NewBucket, limit: number) => setSetting(db, newLimitKey(bucket), limit);
export const setAccentSetting = (db: Db, accent: Accent) => setSetting(db, ACCENT_KEY, accent);

export async function getAccentSetting(db: Db): Promise<Accent> {
  const [row] = await db.select().from(settings).where(eq(settings.key, ACCENT_KEY));
  return isAccent(row?.value) ? row.value : DEFAULT_ACCENT;
}

async function newIntroducedOn(db: Db, bucket: NewBucket, today: string) {
  const [row] = await db
    .select({ n: count() })
    .from(cards)
    .where(and(eq(cards.introducedOn, today), inArray(cards.type, [...NEW_BUCKET_INFO[bucket].types])));
  return row?.n ?? 0;
}

/** How many new cards of one kind may still be introduced today. */
export async function getNewQuota(db: Db, bucket: NewBucket, today = vietnamDay()): Promise<NewQuota> {
  const [limit, learned] = await Promise.all([getDailyNewLimit(db, bucket), newIntroducedOn(db, bucket, today)]);
  return { bucket, limit, learned, remaining: Math.max(0, limit - learned) };
}

async function getNewQuotas(db: Db, today: string): Promise<Record<NewBucket, NewQuota>> {
  const quotas = await Promise.all(NEW_BUCKETS.map((bucket) => getNewQuota(db, bucket, today)));
  return Object.fromEntries(quotas.map((quota) => [quota.bucket, quota])) as Record<NewBucket, NewQuota>;
}

// Consecutive Vietnam days with at least one answer, ending today (or yesterday
// when today has no answers yet, so the streak is not shown as broken at 7am).
async function getStreak(db: Db, today: string) {
  const rows = await db
    .selectDistinct({ day: reviews.reviewedOn })
    .from(reviews)
    .where(sql`${reviews.reviewedOn} > ${addDays(today, -400)}`);
  const days = new Set(rows.map((row) => row.day));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function deckSummarySelect(today: string) {
  return {
    id: decks.id,
    slug: decks.slug,
    name: decks.name,
    total: sql<number>`count(${cards.id})`,
    newCount: sql<number>`count(${cards.id}) filter (where ${cards.dueAt} is null)`,
    learning: sql<number>`count(${cards.id}) filter (where ${cards.dueAt} is not null and ${cards.intervalDays} = 0)`,
    due: sql<number>`count(${cards.id}) filter (where ${cards.dueAt} <= ${today})`,
    mature: sql<number>`count(${cards.id}) filter (where ${cards.intervalDays} >= ${MATURE_INTERVAL_DAYS})`,
  };
}

function listDecks(db: Db, today: string): Promise<DeckSummary[]> {
  return db
    .select(deckSummarySelect(today))
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .groupBy(decks.id)
    .orderBy(asc(decks.position), asc(decks.id));
}

export async function getDashboard(db: Db) {
  const today = vietnamDay();
  const lastDay = addDays(today, 6);
  const [deckList, quotas, streak, forecastRows, [reviewedToday]] = await Promise.all([
    listDecks(db, today),
    getNewQuotas(db, today),
    getStreak(db, today),
    // Overdue cards are folded into today: they are what you face this morning.
    db
      .select({ day: sql<string>`max(${cards.dueAt}, ${today})`, n: sql<number>`count(*)` })
      .from(cards)
      .where(lte(cards.dueAt, lastDay))
      .groupBy(sql`1`),
    db.select({ n: count() }).from(reviews).where(eq(reviews.reviewedOn, today)),
  ]);

  const byDay = new Map(forecastRows.map((row) => [row.day, row.n]));
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    return { day, due: byDay.get(day) ?? 0 };
  });

  return { today, decks: deckList, due: forecast[0].due, quotas, streak, reviewedToday: reviewedToday?.n ?? 0, forecast };
}

export async function getDeckBySlug(db: Db, slug: string) {
  const [deck] = await db.select().from(decks).where(eq(decks.slug, slug));
  return deck ?? null;
}

export async function getDeckById(db: Db, id: number) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, id));
  return deck ?? null;
}

export async function getDeckSummary(db: Db, deckId: number, today = vietnamDay()): Promise<DeckSummary> {
  const [row] = await db
    .select(deckSummarySelect(today))
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .where(eq(decks.id, deckId))
    .groupBy(decks.id);
  return row;
}

/** Per-unit progress for decks whose cards carry `unit-NN` tags. */
export async function getUnitProgress(db: Db, deckId: number, today = vietnamDay()): Promise<UnitProgress[]> {
  const rows = await db.all<{ tag: string; total: number; studied: number; due: number }>(sql`
    select t.value as tag,
           count(*) as total,
           count(*) filter (where cards.due_at is not null) as studied,
           count(*) filter (where cards.due_at <= ${today}) as due
    from cards, json_each(cards.tags) as t
    where cards.deck_id = ${deckId} and t.value glob 'unit-[0-9][0-9]'
    group by t.value
    order by t.value
  `);
  return rows.map((row) => ({ unit: Number(row.tag.slice(5)), total: row.total, studied: row.studied, due: row.due }));
}

function statusCondition(status: CardStatus): SQL {
  switch (status) {
    case "new":
      return isNull(cards.dueAt);
    case "learning":
      return sql`${cards.dueAt} is not null and ${cards.intervalDays} = 0`;
    case "young":
      return sql`${cards.intervalDays} between 1 and ${MATURE_INTERVAL_DAYS - 1}`;
    case "mature":
      return sql`${cards.intervalDays} >= ${MATURE_INTERVAL_DAYS}`;
  }
}

export async function listDeckCards(
  db: Db,
  deckId: number,
  filters: { unit: number | null; q: string; status: CardStatus | null; page: number },
): Promise<{ rows: Card[]; total: number }> {
  const conditions: SQL[] = [eq(cards.deckId, deckId)];
  if (filters.unit) conditions.push(hasUnit(filters.unit));
  if (filters.status) conditions.push(statusCondition(filters.status));
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(sql`${cards.front} like ${pattern} escape '\\'`, sql`${cards.back} like ${pattern} escape '\\'`)!);
  }
  const where = and(...conditions);
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(cards)
      .where(where)
      .orderBy(asc(cards.position), asc(cards.id))
      .limit(CARDS_PAGE_SIZE)
      .offset((filters.page - 1) * CARDS_PAGE_SIZE),
    db.select({ n: count() }).from(cards).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export async function getCard(db: Db, id: number) {
  const [card] = await db.select().from(cards).where(eq(cards.id, id));
  return card ?? null;
}

function scopeConditions(scope: StudyScope): SQL[] {
  const conditions: SQL[] = [];
  if (scope.deckId) conditions.push(eq(cards.deckId, scope.deckId));
  if (scope.unit) conditions.push(hasUnit(scope.unit));
  return conditions;
}

const studyCardSelect = {
  id: cards.id,
  deckSlug: decks.slug,
  type: cards.type,
  front: cards.front,
  back: cards.back,
  ipa: cards.ipa,
  ipaUk: cards.ipaUk,
  example: cards.example,
  exampleVi: cards.exampleVi,
  note: cards.note,
  tags: cards.tags,
  ease: cards.ease,
  intervalDays: cards.intervalDays,
  reps: cards.reps,
  lapses: cards.lapses,
  dueAt: cards.dueAt,
};

/** Cards due today or earlier, oldest first. */
export function getReviewQueue(db: Db, scope: StudyScope, today = vietnamDay()): Promise<StudyCard[]> {
  return db
    .select(studyCardSelect)
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(lte(cards.dueAt, today), ...scopeConditions(scope)))
    .orderBy(asc(cards.dueAt), asc(decks.position), asc(cards.position))
    .limit(STUDY_BATCH);
}

export async function countDue(db: Db, scope: StudyScope, today = vietnamDay()) {
  const [row] = await db
    .select({ n: count() })
    .from(cards)
    .where(and(lte(cards.dueAt, today), ...scopeConditions(scope)));
  return row?.n ?? 0;
}

/** Never-studied cards in book order, up to what today's limit still allows. */
export async function getNewQueue(db: Db, scope: StudyScope, limit: number): Promise<StudyCard[]> {
  if (limit <= 0) return [];
  return db
    .select(studyCardSelect)
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(isNull(cards.dueAt), ...scopeConditions(scope)))
    .orderBy(asc(decks.position), asc(cards.position), asc(cards.id))
    .limit(limit);
}

/**
 * A random draw for practice. "learned" means studied at least once; practice
 * never writes a schedule, so drawing the same card twice in a day is harmless.
 */
export function getPracticeCards(
  db: Db,
  deckId: number,
  options: { unit: number | null; source: "learned" | "all"; count: number },
): Promise<StudyCard[]> {
  const conditions: SQL[] = [eq(cards.deckId, deckId)];
  if (options.unit) conditions.push(hasUnit(options.unit));
  if (options.source === "learned") conditions.push(sql`${cards.dueAt} is not null`);
  return db
    .select(studyCardSelect)
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(options.count);
}

/** Other cards of the same deck, for wrong quiz answers. */
export function getDistractorPool(db: Db, deckId: number, size = 120) {
  return db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(sql`random()`)
    .limit(size);
}

export async function countPracticeSource(db: Db, deckId: number, unit: number | null) {
  const conditions: SQL[] = [eq(cards.deckId, deckId)];
  if (unit) conditions.push(hasUnit(unit));
  const [row] = await db
    .select({ all: sql<number>`count(*)`, learned: sql<number>`count(*) filter (where ${cards.dueAt} is not null)` })
    .from(cards)
    .where(and(...conditions));
  return row ?? { all: 0, learned: 0 };
}

/**
 * Meanings of the given words from the word books, for the reading help on
 * sentence cards. Keys are lowercase; the first book that has a word wins.
 */
export async function getGlossary(db: Db, words: readonly string[]): Promise<Record<string, string>> {
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += MAX_PARAMS) chunks.push(words.slice(i, i + MAX_PARAMS));
  const results = await Promise.all(
    chunks.map((chunk) =>
      db
        .select({ word: sql<string>`lower(${cards.front})`, meaning: cards.back, deck: decks.position, position: cards.position })
        .from(cards)
        .innerJoin(decks, eq(decks.id, cards.deckId))
        .where(and(eq(cards.type, "vocab"), inArray(sql`lower(${cards.front})`, chunk))),
    ),
  );
  const rows = results.flat().sort((a, b) => a.deck - b.deck || a.position - b.position);
  const glossary: Record<string, string> = {};
  for (const row of rows) glossary[row.word] ??= row.meaning;
  return glossary;
}
