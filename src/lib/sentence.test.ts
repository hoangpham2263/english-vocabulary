import { describe, expect, it } from "vitest";
import {
  chunks,
  clozeWord,
  hintWords,
  lookup,
  lookupForms,
  markWords,
  passagePairs,
  asParagraph,
  seededOrder,
  tileLabel,
  sentenceMatches,
  translationOverlap,
  withGap,
} from "@/lib/sentence";

const show = (marks: ReturnType<typeof markWords>) =>
  marks.map((m) => (m.kind === "missing" ? "_" : m.kind === "ok" ? m.text : `[${m.kind}:${m.text}]`)).join(" ");

describe("sentence answers", () => {
  it("ignores case and punctuation, not word order", () => {
    expect(sentenceMatches("are you hungry", "Are you hungry?")).toBe(true);
    expect(sentenceMatches("Don’t eat meat", "Don't eat meat!")).toBe(true);
    expect(sentenceMatches("you are hungry", "Are you hungry?")).toBe(false);
    expect(sentenceMatches("", "Hi.")).toBe(false);
  });

  it("marks words without letting one slip turn the rest red", () => {
    expect(show(markWords("I want be a doctor", "I want to be a doctor."))).toBe("I want _ be a doctor");
    expect(show(markWords("I wants to be a doctor", "I want to be a doctor."))).toBe("I [wrong:wants] to be a doctor");
    expect(show(markWords("I really want to be a doctor", "I want to be a doctor."))).toBe("I [extra:really] want to be a doctor");
  });

  it("hints the next right word", () => {
    expect(hintWords("I want be", "I want to be a doctor.")).toBe("I want to");
    expect(hintWords("", "I want to be a doctor.")).toBe("I");
  });
});

describe("reading help", () => {
  it("finds a word through its dictionary form", () => {
    expect(lookupForms("Studies")).toContain("study");
    expect(lookupForms("running")).toContain("run");
    expect(lookupForms("arrived.")).toContain("arrive");
    expect(lookup({ hungry: "đói" }, "hungry?")).toEqual({ form: "hungry", meaning: "đói" });
    expect(lookup({}, "zebra")).toBeNull();
  });
});

describe("cloze", () => {
  it("blanks the longest content word, the same every time", () => {
    expect(clozeWord("Are you thirsty?")).toEqual({ index: 2, word: "thirsty" });
    expect(withGap("Are you thirsty?", 2)).toBe("Are you _____?");
  });
});

describe("translations and order", () => {
  it("measures how close a Vietnamese translation is", () => {
    expect(translationOverlap("ban co doi bung khong", "Bạn có đói bụng không?")).toBe(1);
    expect(translationOverlap("toi doi", "Bạn có đói bụng không?")).toBeLessThan(0.5);
  });

  it("shuffles the same way for a card and never in order", () => {
    expect(seededOrder(5, 42)).toEqual(seededOrder(5, 42));
    expect(seededOrder(5, 42).toSorted()).toEqual([0, 1, 2, 3, 4]);
    for (let seed = 1; seed < 50; seed += 1) expect(seededOrder(2, seed)).toEqual([1, 0]);
    expect(chunks(" a  b ")).toEqual(["a", "b"]);
  });

  it("hides on a tile where the sentence starts and ends", () => {
    expect(tileLabel("When", 0)).toBe("when");
    expect(tileLabel("pond.", 6)).toBe("pond");
    expect(tileLabel("child,", 3)).toBe("child");
    expect(tileLabel("I'm", 0)).toBe("I'm");
    expect(tileLabel("Tom", 0)).toBe("Tom");
  });
});

describe("passages", () => {
  it("pairs sentences line by line and reads as one paragraph", () => {
    const card = { front: "One.\nTwo.", back: "Một.\nHai." };
    expect(passagePairs(card)).toEqual([{ en: "One.", vi: "Một." }, { en: "Two.", vi: "Hai." }]);
    expect(asParagraph(card.front)).toBe("One. Two.");
  });
});
