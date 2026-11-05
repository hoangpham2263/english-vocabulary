import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PASSAGE_TOPICS, validatePassages } from "../../scripts/passage-format.mjs";

describe("translation passage data", () => {
  const data = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "passages", "passages.json"), "utf8"));

  it("is valid, sentence-aligned, with every topic filled", () => {
    expect(validatePassages(data)).toEqual([]);
    expect(data.topics).toEqual(Object.fromEntries(Object.entries(PASSAGE_TOPICS)));
    for (const unit of Object.keys(data.topics)) {
      expect(data.passages.some((p: { unit: number }) => String(p.unit) === unit)).toBe(true);
    }
  });
});
