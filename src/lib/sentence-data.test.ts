import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SENTENCE_TOPICS, sentenceNote, validateSentences } from "../../scripts/sentence-format.mjs";

describe("translation sentence data", () => {
  const data = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "sentences", "sentences.json"), "utf8"));

  it("is valid, with every topic filled", () => {
    expect(validateSentences(data)).toEqual([]);
    expect(data.topics).toEqual(Object.fromEntries(Object.entries(SENTENCE_TOPICS).map(([k, v]) => [k, v])));
    for (const unit of Object.keys(data.topics)) {
      expect(data.sentences.filter((s: { unit: number }) => String(s.unit) === unit).length).toBeGreaterThan(20);
    }
  });

  it("credits both Tatoeba sentences and their authors", () => {
    expect(sentenceNote({ enId: 1, enAuthor: "a", viId: 2, viAuthor: "" })).toBe("Tatoeba #1 (a) · #2");
  });
});
