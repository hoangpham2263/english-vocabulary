import { describe, expect, it } from "vitest";
import { createSessionToken, isValidSessionToken, safeEqual, SESSION_DAYS } from "./session";

const env = { ENGLISH_VOCABULARY_USERNAME: "learner", ENGLISH_VOCABULARY_SESSION_SECRET: "x".repeat(40) };

describe("session token", () => {
  it("accepts a token it signed", async () => {
    const token = await createSessionToken(env);
    expect(await isValidSessionToken(env, token!)).toBe(true);
  });

  it("expires", async () => {
    const now = Date.now();
    const token = await createSessionToken(env, now);
    const later = now + (SESSION_DAYS + 1) * 24 * 60 * 60 * 1000;
    expect(await isValidSessionToken(env, token!, later)).toBe(false);
  });

  it("rejects a tampered, foreign or missing token", async () => {
    const token = (await createSessionToken(env))!;
    expect(await isValidSessionToken(env, `${token}x`)).toBe(false);
    expect(await isValidSessionToken({ ...env, ENGLISH_VOCABULARY_SESSION_SECRET: "y".repeat(40) }, token)).toBe(false);
    expect(await isValidSessionToken({ ...env, ENGLISH_VOCABULARY_USERNAME: "someone-else" }, token)).toBe(false);
    expect(await isValidSessionToken(env, undefined)).toBe(false);
  });

  it("refuses to work with a short secret", async () => {
    const weak = { ...env, ENGLISH_VOCABULARY_SESSION_SECRET: "short" };
    expect(await createSessionToken(weak)).toBeNull();
  });

  it("compares text exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
