import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IPA_SOUND_COUNT, validateIpa } from "../../scripts/ipa-format.mjs";

describe("IPA chart data", () => {
  it("has all 44 sounds, each with examples and their transcriptions", () => {
    const sounds = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "ipa", "ipa.json"), "utf8"));
    expect(validateIpa(sounds)).toEqual([]);
    expect(sounds).toHaveLength(IPA_SOUND_COUNT);
  });
});
