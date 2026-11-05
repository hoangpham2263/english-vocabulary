import { describe, expect, it } from "vitest";
import {
  NEW_CARD,
  addDays,
  formatInterval,
  nextInterval,
  previewIntervals,
  requeue,
  schedule,
  vietnamDay,
  type CardSchedule,
} from "./srs";

const review = (intervalDays: number, ease = 2.5, lapses = 0): CardSchedule => ({
  ease,
  intervalDays,
  reps: 3,
  lapses,
  dueAt: "2026-10-01",
});

describe("new or learning card", () => {
  it("Quên keeps it in the session", () => {
    expect(nextInterval(NEW_CARD, 0)).toEqual({ intervalDays: 0, ease: 2.5 });
  });

  it("Khó and Nhớ both give one day", () => {
    expect(nextInterval(NEW_CARD, 1).intervalDays).toBe(1);
    expect(nextInterval(NEW_CARD, 2).intervalDays).toBe(1);
    expect(nextInterval(NEW_CARD, 1).ease).toBe(2.5);
  });

  it("Dễ gives four days and raises ease", () => {
    expect(nextInterval(NEW_CARD, 3)).toEqual({ intervalDays: 4, ease: 2.65 });
  });

  it("Dễ on a relearning card gives three days", () => {
    expect(nextInterval(review(0, 2.3, 1), 3)).toEqual({ intervalDays: 3, ease: 2.45 });
  });

  it("Quên on a new card is not a lapse", () => {
    expect(schedule(NEW_CARD, 0, "2026-10-01")).toMatchObject({ lapses: 0, reps: 1, dueAt: "2026-10-01" });
  });
});

describe("review card", () => {
  it("Quên lapses, lowers ease and returns to the session", () => {
    const next = schedule(review(10), 0, "2026-10-01");
    expect(next).toMatchObject({ intervalDays: 0, ease: 2.3, lapses: 1, dueAt: "2026-10-01" });
  });

  it("ease never drops below 1.3", () => {
    expect(nextInterval(review(10, 1.4), 0).ease).toBe(1.3);
    expect(nextInterval(review(10, 1.35), 1).ease).toBe(1.3);
  });

  it("Khó multiplies by 1.2 and lowers ease", () => {
    expect(nextInterval(review(10), 1)).toEqual({ intervalDays: 12, ease: 2.35 });
  });

  it("Khó always moves at least one day", () => {
    expect(nextInterval(review(1), 1).intervalDays).toBe(2);
    expect(nextInterval(review(2), 1).intervalDays).toBe(3);
  });

  it("Nhớ multiplies by ease", () => {
    expect(nextInterval(review(10), 2)).toEqual({ intervalDays: 25, ease: 2.5 });
    expect(nextInterval(review(1, 1.3), 2).intervalDays).toBe(2);
  });

  it("Dễ applies the easy bonus with the pre-answer ease", () => {
    // good = 25, easy = round(10 * 2.5 * 1.3) = 33
    expect(nextInterval(review(10), 3)).toEqual({ intervalDays: 33, ease: 2.65 });
  });

  it("Dễ is always longer than Nhớ", () => {
    expect(nextInterval(review(1, 1.3), 3).intervalDays).toBe(3);
  });

  it("caps every interval at 365 days", () => {
    expect(nextInterval(review(300), 2).intervalDays).toBe(365);
    expect(nextInterval(review(300), 3).intervalDays).toBe(365);
    expect(nextInterval(review(340), 1).intervalDays).toBe(365);
  });

  it("schedules due date from today", () => {
    expect(schedule(review(10), 2, "2026-12-20")).toMatchObject({ dueAt: "2027-01-14", reps: 4 });
  });

  it("previews all four buttons", () => {
    expect(previewIntervals(review(10))).toEqual({ 0: 0, 1: 12, 2: 25, 3: 33 });
  });
});

describe("Vietnam calendar day", () => {
  it("uses Asia/Ho_Chi_Minh rather than UTC", () => {
    // 18:30 UTC is 01:30 the next day in Vietnam.
    expect(vietnamDay(new Date("2026-09-30T18:30:00Z"))).toBe("2026-10-01");
    expect(vietnamDay(new Date("2026-09-30T16:59:00Z"))).toBe("2026-09-30");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("labels and session queue", () => {
  it("formats intervals in Vietnamese", () => {
    expect(formatInterval(0)).toBe("ôn lại ngay");
    expect(formatInterval(8)).toBe("8 ngày");
    expect(formatInterval(45)).toBe("1,5 tháng");
    expect(formatInterval(365)).toBe("1 năm");
  });

  it("puts a failed card back after three others", () => {
    expect(requeue(["b", "c", "d", "e"], "a")).toEqual(["b", "c", "d", "a", "e"]);
    expect(requeue(["b"], "a")).toEqual(["b", "a"]);
    expect(requeue([], "a")).toEqual(["a"]);
  });
});
