import { describe, expect, it } from "vitest";
import { ACCENT_LANG, ipaFor, isAccent } from "./accent";

describe("accent", () => {
  it("maps to the speech locales", () => {
    expect(ACCENT_LANG).toEqual({ us: "en-US", uk: "en-GB" });
    expect(isAccent("uk")).toBe(true);
    expect(isAccent("au")).toBe(false);
  });

  it("shows British IPA for UK and falls back to American when it is missing", () => {
    expect(ipaFor({ ipa: "hɑːt", ipaUk: "hɒt" }, "uk")).toBe("hɒt");
    expect(ipaFor({ ipa: "hɑːt", ipaUk: "hɒt" }, "us")).toBe("hɑːt");
    expect(ipaFor({ ipa: "hɑːt", ipaUk: null }, "uk")).toBe("hɑːt");
  });
});
