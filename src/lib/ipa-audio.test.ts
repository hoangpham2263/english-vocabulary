import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import audio from "./ipa-audio.json";
import { soundAudioUrl, symbolOf } from "./ipa-audio";

const root = join(__dirname, "..", "..");
const chart: { symbol: string }[] = JSON.parse(readFileSync(join(root, "data", "ipa", "ipa.json"), "utf8"));

describe("IPA audio", () => {
  it("has a US and a UK clip for every one of the 44 sounds", () => {
    for (const { symbol } of chart) {
      const sound = (audio.sounds as Record<string, { us: string; uk: string }>)[symbol];
      expect(sound, symbol).toBeTruthy();
      expect(existsSync(join(root, "public", "audio", "ipa", sound.us)), `${symbol} us`).toBe(true);
      expect(existsSync(join(root, "public", "audio", "ipa", sound.uk)), `${symbol} uk`).toBe(true);
    }
  });

  it("picks the clip for the chosen accent under the base path", () => {
    expect(symbolOf("/iː/")).toBe("iː");
    expect(soundAudioUrl("/iː/", "us")).toBe("/english-vocabulary/audio/ipa/us/01.mp3");
    expect(soundAudioUrl("/iː/", "uk")).toBe("/english-vocabulary/audio/ipa/uk/01.mp3");
    expect(soundAudioUrl("/x/", "us")).toBeNull();
  });
});
