// The English Lab API: one account, one D1 database. The app on GitHub Pages
// calls these routes with a Bearer token; every route but login requires it.
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";
import { isAccent } from "../src/lib/accent";
import { ITEM_NOUN, deckBucket, deckKind } from "../src/lib/deck-kind";
import { BASIC_WORDS } from "../src/lib/basic-words";
import { MAX_FIELD_LENGTH, parseImport } from "../src/lib/import";
import { defaultPracticeCount, endlessDraw, ENDLESS_PRACTICE, modesFor, planQuiz, practiceCounts, type PracticeMode } from "../src/lib/practice";
import { lookupWords } from "../src/lib/sentence";
import { RATINGS, schedule, vietnamDay, type CardSchedule, type Rating } from "../src/lib/srs";
import { CARD_STATUS_LABELS, NEW_BUCKETS, RESERVED_SLUGS, isNewLimit, parseUnit, slugify, type CardStatus, type NewBucket } from "../src/lib/study";
import { CARD_TYPES } from "../src/lib/card-types";
import * as q from "./queries";
import type { Db } from "./queries";
import { cards, decks, reviews, settings } from "./schema";
import { createSessionToken, isValidSessionToken, safeEqual } from "./session";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  ENGLISH_VOCABULARY_USERNAME?: string;
  ENGLISH_VOCABULARY_PASSWORD?: string;
  ENGLISH_VOCABULARY_SESSION_SECRET?: string;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const notFound = (message = "Không tìm thấy") => new HttpError(404, message);
const json = (body: unknown, status = 200) => Response.json(body, { status });

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  return parsed.data;
}

// ---------- Login ----------

const LOGIN_FAILURE_KEY = "login_failures";
const MAX_LOGIN_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;
type LoginFailures = { count: number; until: number };

async function login(request: Request, env: Env, db: Db) {
  const { username, password } = await body(request, z.object({ username: z.string().trim(), password: z.string() }));
  const expectedUser = env.ENGLISH_VOCABULARY_USERNAME;
  const expectedPassword = env.ENGLISH_VOCABULARY_PASSWORD;
  const token = await createSessionToken(env);
  if (!expectedUser || !expectedPassword || !token) throw new HttpError(500, "Tài khoản chưa được cấu hình trên máy chủ.");

  // The API is public, so password guesses are capped. One account: a shared counter is enough.
  const [row] = await db.select().from(settings).where(eq(settings.key, LOGIN_FAILURE_KEY));
  const failures = (row?.value as LoginFailures | undefined) ?? { count: 0, until: 0 };
  if (failures.until > Date.now()) throw new HttpError(429, "Sai quá nhiều lần. Thử lại sau 15 phút.");

  // Both comparisons always run, so timing does not reveal which field was wrong.
  const userOk = safeEqual(username, expectedUser);
  const passwordOk = safeEqual(password, expectedPassword);
  if (!userOk || !passwordOk) {
    const count = failures.until && failures.until <= Date.now() ? 1 : failures.count + 1;
    await q.setSetting(db, LOGIN_FAILURE_KEY, { count, until: count >= MAX_LOGIN_FAILURES ? Date.now() + LOCK_MS : 0 });
    throw new HttpError(401, "Sai tên đăng nhập hoặc mật khẩu.");
  }
  if (row) await db.delete(settings).where(eq(settings.key, LOGIN_FAILURE_KEY));
  return json({ token });
}

// ---------- Decks and cards ----------

const text = (max = MAX_FIELD_LENGTH) => z.string().trim().max(max);
const optionalText = () =>
  text()
    .nullish()
    .transform((value) => (value ? value : null));
const tagsField = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20),
  );

const cardInput = z.object({
  deckId: z.number().int().positive(),
  cardId: z.number().int().positive().optional(),
  type: z.enum(CARD_TYPES),
  front: text(500).min(1, "Nhập mặt trước"),
  back: text().min(1, "Nhập mặt sau"),
  ipa: optionalText(),
  example: optionalText(),
  exampleVi: optionalText(),
  note: optionalText(),
  tags: tagsField,
});

const isUniqueViolation = (error: unknown) => String((error as { cause?: unknown })?.cause ?? error).includes("UNIQUE constraint failed");

async function requireDeck(db: Db, slug: string) {
  const deck = await q.getDeckBySlug(db, decodeURIComponent(slug));
  if (!deck) throw notFound("Không tìm thấy bộ thẻ");
  return deck;
}

const nextPosition = async (db: Db, deckId: number) => {
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${cards.position}), 0)` }).from(cards).where(eq(cards.deckId, deckId));
  return max + 1;
};

async function createDeck(request: Request, db: Db) {
  const input = await body(request, z.object({ name: text(120).min(1, "Nhập tên bộ thẻ"), slug: z.string().trim().optional() }));
  const slug = slugify(input.slug || input.name);
  if (!slug) throw new HttpError(400, "Tên bộ thẻ cần có chữ hoặc số");
  if (RESERVED_SLUGS.includes(slug)) throw new HttpError(400, "Đường dẫn này đã được dùng cho trang khác");
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${decks.position}), 0)` }).from(decks);
  try {
    await db.insert(decks).values({ name: input.name, slug, position: max + 1 });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "Đã có bộ thẻ dùng đường dẫn này");
    throw error;
  }
  return json({ slug }, 201);
}

async function saveCard(request: Request, db: Db) {
  const { deckId, cardId, ...content } = await body(request, cardInput);
  const deck = await q.getDeckById(db, deckId);
  if (!deck) throw notFound("Không tìm thấy bộ thẻ");
  try {
    if (cardId) {
      // Editing changes the content only; the schedule stays as it was.
      const updated = await db.update(cards).set(content).where(and(eq(cards.id, cardId), eq(cards.deckId, deck.id))).returning({ id: cards.id });
      if (updated.length === 0) throw notFound("Không tìm thấy thẻ");
    } else {
      await db.insert(cards).values({ ...content, deckId: deck.id, position: await nextPosition(db, deck.id) });
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "Bộ thẻ đã có thẻ này");
    throw error;
  }
  return json({ slug: deck.slug, front: content.front });
}

async function deleteCard(db: Db, id: number) {
  const [card] = await db.delete(cards).where(eq(cards.id, id)).returning({ deckId: cards.deckId });
  if (!card) throw notFound("Không tìm thấy thẻ");
  const deck = await q.getDeckById(db, card.deckId);
  return json({ slug: deck?.slug ?? "" });
}

async function importCards(request: Request, db: Db) {
  const input = await body(
    request,
    z.object({ deckId: z.number().int().positive(), type: z.enum(CARD_TYPES), tags: tagsField, text: z.string().max(4_000_000) }),
  );
  const deck = await q.getDeckById(db, input.deckId);
  if (!deck) throw new HttpError(400, "Thiếu bộ thẻ hoặc loại thẻ");

  const { drafts, errors } = parseImport(input.text);
  if (drafts.length === 0) throw new HttpError(400, errors[0] ? `Dòng ${errors[0].line}: ${errors[0].reason}` : "Chưa có dòng nào");

  const existing = await db.select({ front: cards.front }).from(cards).where(and(eq(cards.deckId, deck.id), eq(cards.type, input.type)));
  const known = new Set(existing.map((row) => row.front));
  const start = await nextPosition(db, deck.id);

  // Existing cards keep their schedule; only their text is refreshed. One
  // statement per card, because D1 caps the parameters of a single statement.
  const statements = drafts.map((draft, i) =>
    db
      .insert(cards)
      .values({ ...draft, deckId: deck.id, type: input.type, tags: input.tags, position: start + i })
      .onConflictDoUpdate({
        target: [cards.deckId, cards.type, cards.front],
        set: {
          back: sql`excluded.back`,
          example: sql`coalesce(excluded.example, ${cards.example})`,
          exampleVi: sql`coalesce(excluded.example_vi, ${cards.exampleVi})`,
          ipa: sql`coalesce(excluded.ipa, ${cards.ipa})`,
        },
      }),
  );
  await db.batch(statements as [(typeof statements)[number], ...typeof statements]);

  const added = drafts.filter((draft) => !known.has(draft.front)).length;
  const skipped = errors.length > 0 ? `, bỏ qua ${errors.length} dòng lỗi` : "";
  return json({ message: `Đã thêm ${added} thẻ, cập nhật ${drafts.length - added} thẻ${skipped}.` });
}

// ---------- Studying ----------

const answerInput = z.object({
  cardId: z.number().int().positive(),
  rating: z.number().int().refine((value) => RATINGS.includes(value as Rating)),
});

async function answerCard(request: Request, db: Db) {
  const { cardId, rating } = await body(request, answerInput);
  const today = vietnamDay();
  // The schedule is computed from the stored row, never from what the browser
  // believes. The update and the review row commit together.
  const card = await q.getCard(db, cardId);
  if (!card) return json({ ok: false, error: "Không tìm thấy thẻ" });
  const next = schedule(card, rating as Rating, today);
  const [, inserted] = await db.batch([
    db
      .update(cards)
      .set({ ease: next.ease, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses, dueAt: next.dueAt, introducedOn: card.introducedOn ?? today })
      .where(eq(cards.id, cardId)),
    db
      .insert(reviews)
      .values({
        cardId,
        rating,
        reviewedOn: today,
        prevEase: card.ease,
        prevIntervalDays: card.intervalDays,
        prevReps: card.reps,
        prevLapses: card.lapses,
        prevDueAt: card.dueAt,
        prevIntroducedOn: card.introducedOn,
      })
      .returning({ id: reviews.id }),
  ]);
  return json({ ok: true, reviewId: inserted[0].id, card: next });
}

/** Restores the card to how it was before this answer, if that is still its latest one. */
async function undoAnswer(db: Db, reviewId: number) {
  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!review) return json({ ok: false, error: "Câu trả lời đã được hoàn tác" });
  const [latest] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.cardId, review.cardId)).orderBy(desc(reviews.id)).limit(1);
  if (latest?.id !== review.id) return json({ ok: false, error: "Thẻ đã được chấm lại sau đó" });

  const restored: CardSchedule = {
    ease: review.prevEase,
    intervalDays: review.prevIntervalDays,
    reps: review.prevReps,
    lapses: review.prevLapses,
    dueAt: review.prevDueAt,
  };
  await db.batch([
    db.update(cards).set({ ...restored, introducedOn: review.prevIntroducedOn }).where(eq(cards.id, review.cardId)),
    db.delete(reviews).where(eq(reviews.id, review.id)),
  ]);
  return json({ ok: true, card: restored });
}

// ---------- Pages ----------

async function deckPage(db: Db, slug: string, params: URLSearchParams) {
  const deck = await requireDeck(db, slug);
  const unit = parseUnit(params.get("unit") ?? undefined);
  const search = (params.get("q") ?? "").trim().slice(0, 100);
  const rawStatus = params.get("status");
  const status = rawStatus && rawStatus in CARD_STATUS_LABELS ? (rawStatus as CardStatus) : null;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const [summary, units, quota, list, counts] = await Promise.all([
    q.getDeckSummary(db, deck.id),
    q.getUnitProgress(db, deck.id),
    q.getNewQuota(db, deckBucket(deck.slug)),
    q.listDeckCards(db, deck.id, { unit, q: search, status, page }),
    q.countPracticeSource(db, deck.id, unit),
  ]);
  return json({ deck, summary, units, quota, list, practiceCounts: counts });
}

async function unitPage(db: Db, slug: string, rawUnit: string) {
  const deck = await requireDeck(db, slug);
  const unit = parseUnit(rawUnit);
  if (!unit) throw notFound();
  const [units, quota, list, counts] = await Promise.all([
    q.getUnitProgress(db, deck.id),
    q.getNewQuota(db, deckBucket(deck.slug)),
    q.listDeckCards(db, deck.id, { unit, q: "", status: null, page: 1 }),
    q.countPracticeSource(db, deck.id, unit),
  ]);
  if (!units.some((u) => u.unit === unit)) throw notFound();
  return json({ deck, units, quota, list, practiceCounts: counts });
}

async function studyPage(db: Db, slug: string, params: URLSearchParams) {
  const deck = await requireDeck(db, slug);
  const scope = { deckId: deck.id, unit: parseUnit(params.get("unit") ?? undefined) };
  const quota = await q.getNewQuota(db, deckBucket(deck.slug));
  if (params.get("mode") === "review") {
    const queue = await q.getReviewQueue(db, scope);
    return json({ deck, cards: queue, quota, due: queue.length });
  }
  const [due, queue] = await Promise.all([q.countDue(db, scope), q.getNewQueue(db, scope, quota.remaining)]);
  return json({ deck, cards: queue, quota, due });
}

async function practicePage(db: Db, slug: string, params: URLSearchParams) {
  const deck = await requireDeck(db, slug);
  const kind = deckKind(deck.slug);
  const rawMode = params.get("mode");
  const mode: PracticeMode = modesFor(kind).includes(rawMode as PracticeMode) ? (rawMode as PracticeMode) : "flashcard";
  const source = params.get("source") === "all" ? "all" : "learned";
  const rawCount = Number(params.get("count"));
  const endless = params.get("count") === String(ENDLESS_PRACTICE);
  const count = endless ? endlessDraw(kind) : practiceCounts(kind).includes(rawCount) ? rawCount : defaultPracticeCount(kind);
  const unit = parseUnit(params.get("unit") ?? undefined);

  const [drawn, pool] = await Promise.all([
    q.getPracticeCards(db, deck.id, { unit, source, count }),
    mode === "quiz" ? q.getDistractorPool(db, deck.id) : Promise.resolve([]),
  ]);
  const quiz = mode === "quiz" ? planQuiz(drawn, pool) : {};
  // Word meanings for the reading help: only the words these sentences use,
  // from the word books first, then the built-in list of basic words.
  const words = kind === "sentence" || kind === "passage" ? lookupWords(drawn.map((card) => card.front)) : [];
  const basic = Object.fromEntries(words.filter((word) => word in BASIC_WORDS).map((word) => [word, BASIC_WORDS[word]]));
  const glossary = { ...basic, ...(await q.getGlossary(db, words)) };
  return json({ deck, cards: drawn, quiz, glossary, noun: ITEM_NOUN[kind] });
}

// ---------- Router ----------

async function route(request: Request, env: Env, db: Db): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [a, b, c, d] = parts;
  const id = (value: string | undefined) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw notFound();
    return parsed;
  };

  if (method === "POST" && a === "login" && parts.length === 1) return login(request, env, db);

  const bearer = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!(await isValidSessionToken(env, bearer))) throw new HttpError(401, "Cần đăng nhập");

  if (method === "GET" && a === "me") return json({ accent: await q.getAccentSetting(db) });
  if (method === "GET" && a === "dashboard") return json(await q.getDashboard(db));

  if (method === "PUT" && a === "settings" && b === "accent") {
    const { accent } = await body(request, z.object({ accent: z.string() }));
    if (!isAccent(accent)) throw new HttpError(400, "Giọng không hợp lệ");
    await q.setAccentSetting(db, accent);
    return json({ ok: true });
  }
  if (method === "PUT" && a === "settings" && b === "daily-limit") {
    const input = await body(request, z.object({ bucket: z.string(), limit: z.number() }));
    if (!(NEW_BUCKETS as readonly string[]).includes(input.bucket) || !isNewLimit(input.bucket as NewBucket, input.limit)) {
      throw new HttpError(400, "Giới hạn không hợp lệ");
    }
    await q.setDailyNewLimit(db, input.bucket as NewBucket, input.limit);
    return json({ ok: true });
  }

  if (a === "answers") {
    if (method === "POST" && !b) return answerCard(request, db);
    if (method === "DELETE" && b) return undoAnswer(db, id(b));
  }

  if (a === "cards") {
    if (method === "POST" && !b) return saveCard(request, db);
    if (method === "POST" && b === "import") return importCards(request, db);
    if (method === "GET" && b) {
      const card = await q.getCard(db, id(b));
      if (!card) throw notFound("Không tìm thấy thẻ");
      return json(card);
    }
    if (method === "DELETE" && b) return deleteCard(db, id(b));
  }

  if (a === "decks") {
    if (method === "POST" && !b) return createDeck(request, db);
    if (method === "GET" && b && !c) return deckPage(db, b, url.searchParams);
    if (method === "GET" && b && c === "basic") return json(await requireDeck(db, b));
    if (method === "GET" && b && c === "study") return studyPage(db, b, url.searchParams);
    if (method === "GET" && b && c === "practice") return practicePage(db, b, url.searchParams);
    if (method === "GET" && b && c === "units" && d) return unitPage(db, b, d);
  }

  throw notFound();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    let response: Response;
    try {
      response = await route(request, env, drizzle(env.DB) as unknown as Db);
    } catch (error) {
      if (error instanceof HttpError) response = json({ error: error.message }, error.status);
      else {
        console.error(error);
        response = json({ error: "Máy chủ gặp lỗi" }, 500);
      }
    }
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};
