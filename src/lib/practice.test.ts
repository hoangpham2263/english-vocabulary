import { describe, expect, it } from "vitest";
import {
  closestMeaning,
  hintFrom,
  markAnswer,
  slotAnswer,
  blankOut,
  isCorrectMeaning,
  isExactMeaning,
  isCorrectSpelling,
  meaningOptions,
  modesFor,
  normalizeAnswer,
  planQuiz,
  quizOptions,
  sayTarget,
  scorePronunciation,
  similarity,
  spokenText,
} from "./practice";

const seeded = () => {
  let s = 42;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

describe("typed answers", () => {
  it("ignores case, spaces, punctuation and curly apostrophes", () => {
    expect(normalizeAnswer("  Vice  Versa! ")).toBe("vice versa");
    expect(isCorrectSpelling("don’t", "don't")).toBe(true);
    expect(isCorrectSpelling("Afraid.", "afraid")).toBe(true);
  });

  it("rejects wrong or empty answers", () => {
    expect(isCorrectSpelling("afriad", "afraid")).toBe(false);
    expect(isCorrectSpelling("   ", "afraid")).toBe(false);
  });
});

describe("blanking the example", () => {
  it("hides the word and its inflections", () => {
    expect(blankOut("The dog attacked the cat.", "attack")).toBe("The dog ________ the cat.");
    expect(blankOut("The train arrives at six.", "arrive")).toBe("The train _______ at six.");
    expect(blankOut("She carried the bag.", "carry")).toBe("She _______ the bag.");
  });

  it("leaves other words alone", () => {
    expect(blankOut("I agree with you.", "agree")).toBe("I _____ with you.");
    expect(blankOut("Hello there.", "afraid")).toBe("Hello there.");
  });
});

describe("pronunciation score", () => {
  it("passes an exact or contained match", () => {
    expect(scorePronunciation(["afraid"], "afraid").passed).toBe(true);
    expect(scorePronunciation(["I am afraid"], "afraid").score).toBe(1);
  });

  it("takes the best alternative", () => {
    const result = scorePronunciation(["a fred", "afraid"], "afraid");
    expect(result).toMatchObject({ heard: "afraid", passed: true });
  });

  it("fails a different word", () => {
    expect(scorePronunciation(["fried"], "afraid").passed).toBe(false);
    expect(similarity("", "afraid")).toBe(0);
  });
});

describe("quiz options", () => {
  it("has the right answer and three distinct wrong ones", () => {
    const options = quizOptions("sợ", ["sợ", "vui", "buồn", "giận", "vui"], seeded());
    expect(options).toHaveLength(4);
    expect(options).toContain("sợ");
    expect(new Set(options).size).toBe(4);
  });

  it("works with a small pool", () => {
    expect(quizOptions("a", ["b"], seeded())).toHaveLength(2);
  });
});

describe("sound cards", () => {
  const sound = { type: "sound", front: "/iː/", example: "see, eat, green" };
  it("is heard through its key word, never the symbol", () => {
    expect(spokenText(sound)).toBe("see");
    expect(sayTarget(sound)).toBe("see");
    expect(sayTarget({ type: "vocab", front: "afraid", example: null })).toBe("afraid");
  });

  it("offers only the modes that make sense", () => {
    expect(modesFor("sound")).toEqual(["flashcard", "quiz", "speak"]);
    expect(modesFor("words")).toHaveLength(6);
    expect(modesFor("sentence")).not.toContain("quiz");
  });
});

describe("quiz plan", () => {
  it("fixes direction and options per card, always including the answer", () => {
    const cards = [
      { id: 1, front: "afraid", back: "sợ" },
      { id: 2, front: "agree", back: "đồng ý" },
    ];
    const pool = [...cards, { front: "angry", back: "tức giận" }, { front: "arrive", back: "đến nơi" }];
    const plan = planQuiz(cards, pool, seeded());
    for (const card of cards) {
      const q = plan[card.id];
      expect(q.options).toContain(q.reverse ? card.front : card.back);
      expect(q.options).toHaveLength(4);
    }
  });
});

describe("typed Vietnamese meanings", () => {
  it("splits a meaning into its senses, dropping notes in brackets", () => {
    expect(meaningOptions("sợ, lo sợ; khiếp (cổ)")).toEqual(["sợ", "lo sợ", "khiếp"]);
  });

  it("accepts any sense, with or without tone marks", () => {
    expect(isCorrectMeaning("lo sợ", "sợ, lo sợ")).toBe(true);
    expect(isCorrectMeaning("so", "sợ, lo sợ")).toBe(true);
    expect(isCorrectMeaning("Đồng Ý", "đồng ý")).toBe(true);
    expect(isCorrectMeaning("dong y", "đồng ý")).toBe(true);
  });

  it("accepts a meaning while typing only once a whole sense is there", () => {
    expect(isExactMeaning("thong minh", "thông minh, lanh lợi")).toBe(true);
    expect(isExactMeaning("Lanh Lợi", "thông minh, lanh lợi")).toBe(true);
    expect(isExactMeaning("thong min", "thông minh, lanh lợi")).toBe(false);
    expect(isExactMeaning("", "thông minh")).toBe(false);
  });

  it("forgives a small typo in a longer meaning but not a different word", () => {
    expect(isCorrectMeaning("thong mimh", "thông minh, lanh lợi")).toBe(true);
    expect(isCorrectMeaning("vui", "sợ, lo sợ")).toBe(false);
    expect(isCorrectMeaning("", "sợ")).toBe(false);
  });
});

describe("letter by letter correction", () => {
  const kinds = (marks: ReturnType<typeof markAnswer>) =>
    marks.map((m) => (m.kind === "missing" ? "_" : m.kind === "ok" ? m.char : `[${m.kind}:${m.char}]`)).join("");

  it("checks left to right, position by position", () => {
    expect(kinds(markAnswer("realise", "realize"))).toBe("reali[wrong:s]e");
    expect(kinds(markAnswer("agg", "angry"))).toBe("a[wrong:g]g__");
  });

  it("marks letters past the answer as extra and leaves the rest empty", () => {
    expect(kinds(markAnswer("carefullyy", "carefully"))).toBe("carefully[extra:y]");
    expect(kinds(markAnswer("car", "carefully"))).toBe("car______");
  });

  it("ignores case, and tone marks when folding Vietnamese", () => {
    expect(markAnswer("Realize", "realize").every((m) => m.kind === "ok")).toBe(true);
    expect(markAnswer("dong y", "đồng ý", true).every((m) => m.kind === "ok")).toBe(true);
  });

  it("shows one empty slot per letter before the first check", () => {
    expect(slotAnswer("", "fix")).toEqual([{ kind: "missing", space: false }, { kind: "missing", space: false }, { kind: "missing", space: false }]);
    expect(slotAnswer("a", "lo sợ").map((m) => (m.kind === "typed" ? m.char : m.kind === "missing" && m.space ? " " : "_")).join("")).toBe("a_ __");
  });

  it("picks the closest sense and hints the next right letter", () => {
    expect(closestMeaning("lo so", "sợ, lo sợ")).toBe("lo sợ");
    expect(hintFrom("realise", "realize")).toBe("realiz");
    expect(hintFrom("", "realize")).toBe("r");
    expect(hintFrom("realize", "realize")).toBe("realize");
  });
});
