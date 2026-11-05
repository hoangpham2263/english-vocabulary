import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bookSize, validateBook } from "../../scripts/book-format.mjs";

const dir = join(__dirname, "..", "..", "data", "4000-words");
const books = readdirSync(dir).filter((file) => /^book[1-6]\.json$/.test(file));

describe("4000 Essential Words data", () => {
  it("ships Book 1", () => {
    expect(books).toContain("book1.json");
  });

  it.each(books)("%s has every unit of the contents page and no empty field", (file) => {
    const book = file.replace(".json", "");
    const words = JSON.parse(readFileSync(join(dir, file), "utf8"));
    expect(validateBook(words, book)).toEqual([]);
    expect(words).toHaveLength(bookSize(book));
    // The UK accent switch shows British IPA for every word.
    expect(words.filter((w: { ipaUk?: string }) => !w.ipaUk)).toEqual([]);
  });

  it("allows only the documented unit size exception", () => {
    expect(bookSize("book1")).toBe(600);
    expect(bookSize("book3")).toBe(601);
  });
});
