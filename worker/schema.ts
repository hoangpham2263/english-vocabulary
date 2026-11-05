import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CARD_TYPES } from "../src/lib/card-types";

export const decks = sqliteTable("decks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const cards = sqliteTable(
  "cards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deckId: integer("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    type: text("type", { enum: CARD_TYPES }).notNull().default("vocab"),
    front: text("front").notNull(),
    back: text("back").notNull(),
    ipa: text("ipa"),
    // British (RP) transcription; the app shows it when the learner picks UK.
    ipaUk: text("ipa_uk"),
    example: text("example"),
    exampleVi: text("example_vi"),
    note: text("note"),
    // A JSON array of strings, read with json_each.
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    // Order within the deck; new cards are introduced in this order (book order).
    position: integer("position").notNull().default(0),

    // Scheduling state (SM-2). Content imports never overwrite these columns.
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    // Vietnam calendar day (YYYY-MM-DD) the card is next due. Null = never studied (new).
    dueAt: text("due_at"),
    // Vietnam calendar day the card was first studied; counts toward the daily new limit.
    introducedOn: text("introduced_on"),
  },
  (table) => [
    // Makes imports idempotent: the same word in the same deck is one card.
    uniqueIndex("cards_deck_type_front_key").on(table.deckId, table.type, table.front),
    index("cards_due_at_idx").on(table.dueAt),
    index("cards_deck_position_idx").on(table.deckId, table.position),
    check("cards_type_check", sql`${table.type} in ('vocab', 'grammar', 'writing', 'speaking', 'idiom', 'sound', 'sentence', 'passage')`),
    check("cards_ease_check", sql`${table.ease} >= 1.3`),
    check("cards_interval_check", sql`${table.intervalDays} between 0 and 365`),
  ],
);

// One row per answer: the rating and the card state before it, so the last
// answer can be undone. The day feeds the daily counts and the study streak.
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    reviewedOn: text("reviewed_on").notNull(),
    prevEase: real("prev_ease").notNull(),
    prevIntervalDays: integer("prev_interval_days").notNull(),
    prevReps: integer("prev_reps").notNull(),
    prevLapses: integer("prev_lapses").notNull(),
    prevDueAt: text("prev_due_at"),
    prevIntroducedOn: text("prev_introduced_on"),
  },
  (table) => [
    index("reviews_reviewed_on_idx").on(table.reviewedOn),
    index("reviews_card_idx").on(table.cardId),
    check("reviews_rating_check", sql`${table.rating} between 0 and 3`),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});
