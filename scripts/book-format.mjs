// Shape of a 4000 Essential English Words book file, shared by the converter,
// the seed and the unit test so the three cannot disagree about what is valid.

export const UNITS_PER_BOOK = 30;
export const WORDS_PER_UNIT = 20;
export const BOOK_IDS = ["book1", "book2", "book3", "book4", "book5", "book6"];
export const FIELDS = ["en", "ipa", "vi", "example", "exampleVi"];

// Units whose contents page lists a different number of target words. Book 3
// unit 24 prints 21 (baggage and luggage both appear), so it is kept as printed.
export const UNIT_SIZE_EXCEPTIONS = { book3: { 24: 21 } };

export function unitSize(book, unit) {
  return UNIT_SIZE_EXCEPTIONS[book]?.[unit] ?? WORDS_PER_UNIT;
}

export function bookSize(book) {
  let total = 0;
  for (let unit = 1; unit <= UNITS_PER_BOOK; unit += 1) total += unitSize(book, unit);
  return total;
}

export function bookDeck(book) {
  const n = book.replace("book", "");
  return { slug: `4000-book${n}`, name: `4000 Essential Words – Book ${n}` };
}

export function unitTag(unit) {
  return `unit-${String(unit).padStart(2, "0")}`;
}

/** Returns a list of human-readable problems; empty means the book is valid. */
export function validateBook(words, book) {
  const problems = [];
  if (!Array.isArray(words)) return ["Book is not an array"];
  if (words.length !== bookSize(book)) {
    problems.push(`Expected ${bookSize(book)} words, found ${words.length}`);
  }

  const perUnit = new Map();
  const seen = new Map();
  words.forEach((word, index) => {
    const where = `word ${index + 1} (${word?.en ?? "?"})`;
    if (!Number.isInteger(word?.unit) || word.unit < 1 || word.unit > UNITS_PER_BOOK) {
      problems.push(`${where}: unit must be 1-${UNITS_PER_BOOK}`);
    }
    for (const field of FIELDS) {
      if (typeof word?.[field] !== "string" || word[field].trim() === "") {
        problems.push(`${where}: empty ${field}`);
      }
    }
    if (word?.ipaUk !== undefined && (typeof word.ipaUk !== "string" || word.ipaUk.trim() === "")) {
      problems.push(`${where}: empty ipaUk`);
    }
    perUnit.set(word?.unit, (perUnit.get(word?.unit) ?? 0) + 1);
    const key = String(word?.en).trim().toLowerCase();
    if (seen.has(key)) problems.push(`${where}: duplicate of word ${seen.get(key)}`);
    else seen.set(key, index + 1);
  });

  for (let unit = 1; unit <= UNITS_PER_BOOK; unit += 1) {
    const count = perUnit.get(unit) ?? 0;
    const expected = unitSize(book, unit);
    if (count !== expected) problems.push(`Unit ${unit}: expected ${expected} words, found ${count}`);
  }
  return problems;
}
