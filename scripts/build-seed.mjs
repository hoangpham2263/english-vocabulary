// Writes .seed/seed.sql: every course in data/ as idempotent SQL for D1. A rerun
// refreshes the text of a card but never touches its schedule.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_IDS, bookDeck, unitTag, validateBook } from "./book-format.mjs";
import { IPA_DECK, validateIpa } from "./ipa-format.mjs";
import { PASSAGE_DECK, passageNote, validatePassages } from "./passage-format.mjs";
import { SENTENCE_DECK, sentenceNote, validateSentences } from "./sentence-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, "data", path), "utf8"));
const check = (problems, name) => {
  if (problems.length > 0) throw new Error(`${name} is invalid:\n${problems.join("\n")}`);
};
const str = (value) => (value === null || value === undefined || value === "" ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

const lines = [];
let total = 0;

function addDeck({ slug, name, position }, rows) {
  lines.push(`INSERT INTO decks (slug, name, position) VALUES (${str(slug)}, ${str(name)}, ${position}) ON CONFLICT (slug) DO UPDATE SET name = excluded.name, position = excluded.position;`);
  const deckId = `(SELECT id FROM decks WHERE slug = ${str(slug)})`;
  rows.forEach((row, index) => {
    total += 1;
    lines.push(
      `INSERT INTO cards (deck_id, type, front, back, ipa, ipa_uk, example, example_vi, note, tags, position) VALUES (${deckId}, ${str(row.type)}, ${str(row.front)}, ${str(row.back)}, ${str(row.ipa)}, ${str(row.ipaUk)}, ${str(row.example)}, ${str(row.exampleVi)}, ${str(row.note)}, ${str(JSON.stringify(row.tags))}, ${index + 1}) ON CONFLICT (deck_id, type, front) DO UPDATE SET back = excluded.back, ipa = excluded.ipa, ipa_uk = excluded.ipa_uk, example = excluded.example, example_vi = excluded.example_vi, note = excluded.note, tags = excluded.tags, position = excluded.position;`,
    );
  });
}

const sounds = read("ipa/ipa.json");
check(validateIpa(sounds), "ipa.json");
addDeck(
  IPA_DECK,
  sounds.map((s) => ({
    type: "sound",
    front: `/${s.symbol}/`,
    back: s.vi,
    example: s.examples.join(", "),
    exampleVi: s.examplesIpa.map((ipa) => `/${ipa}/`).join(" · "),
    note: s.tip,
    tags: [unitTag(s.unit)],
  })),
);

for (const book of BOOK_IDS) {
  const words = read(`4000-words/${book}.json`);
  check(validateBook(words, book), `${book}.json`);
  addDeck(
    { ...bookDeck(book), position: BOOK_IDS.indexOf(book) + 1 },
    words.map((w) => ({
      type: "vocab",
      front: w.en.trim(),
      back: w.vi.trim(),
      ipa: w.ipa.trim(),
      ipaUk: w.ipaUk?.trim() || null,
      example: w.example.trim(),
      exampleVi: w.exampleVi.trim(),
      tags: [unitTag(w.unit)],
    })),
  );
}

const sentences = read("sentences/sentences.json");
check(validateSentences(sentences), "sentences.json");
addDeck(
  SENTENCE_DECK,
  sentences.sentences.map((s) => ({ type: "sentence", front: s.en, back: s.vi, note: sentenceNote(s), tags: [unitTag(s.unit)] })),
);

const passages = read("passages/passages.json");
check(validatePassages(passages), "passages.json");
addDeck(
  PASSAGE_DECK,
  passages.passages.map((p) => ({ type: "passage", front: p.en.join("\n"), back: p.vi.join("\n"), note: passageNote(p), tags: [unitTag(p.unit)] })),
);

// The daily word limit the learner already chose; never overrides a later change.
lines.push(`INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_new_limit', '20');`);

mkdirSync(join(root, ".seed"), { recursive: true });
writeFileSync(join(root, ".seed", "seed.sql"), `${lines.join("\n")}\n`);
console.log(`.seed/seed.sql: ${total} cards`);
