// SM-2 as Anki schedules it, reduced to whole days and four answers.
// Pure: no clock, no database. The caller passes "today" as a Vietnam calendar
// day so a card answered at 23:30 in Hà Nội is not scheduled from a UTC date.

export const RATINGS = [0, 1, 2, 3] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABELS: Record<Rating, string> = {
  0: "Quên",
  1: "Khó",
  2: "Nhớ",
  3: "Dễ",
};

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;

export const NEW_GOOD_DAYS = 1;
export const NEW_EASY_DAYS = 4;
export const RELEARN_EASY_DAYS = 3;
export const EASE_STEP_EASY = 0.15;
export const EASE_STEP_HARD = 0.15;
export const EASE_STEP_AGAIN = 0.2;
export const HARD_FACTOR = 1.2;
export const EASY_BONUS = 1.3;

export type CardSchedule = {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  /** Vietnam calendar day, `YYYY-MM-DD`. Null until the card is first studied. */
  dueAt: string | null;
};

export const NEW_CARD: CardSchedule = {
  ease: DEFAULT_EASE,
  intervalDays: 0,
  reps: 0,
  lapses: 0,
  dueAt: null,
};

// Ease is stored with two decimals; rounding here keeps 2.5 - 0.15 at 2.35
// instead of 2.3499999999999996 drifting into later intervals.
function roundEase(value: number) {
  return Math.round(value * 100) / 100;
}

function clampInterval(days: number) {
  return Math.min(MAX_INTERVAL_DAYS, days);
}

/** Interval in days the answer produces. 0 means "again within this session". */
export function nextInterval(card: CardSchedule, rating: Rating): { intervalDays: number; ease: number } {
  const ease = card.ease;
  const ivl = card.intervalDays;

  // New, learning, or relearning after a lapse: the card has no review interval yet.
  if (ivl === 0) {
    const relearning = card.lapses > 0;
    switch (rating) {
      case 0:
        return { intervalDays: 0, ease };
      case 1:
      case 2:
        return { intervalDays: NEW_GOOD_DAYS, ease };
      case 3:
        return {
          intervalDays: relearning ? RELEARN_EASY_DAYS : NEW_EASY_DAYS,
          ease: roundEase(ease + EASE_STEP_EASY),
        };
    }
  }

  switch (rating) {
    case 0:
      return { intervalDays: 0, ease: roundEase(Math.max(MIN_EASE, ease - EASE_STEP_AGAIN)) };
    case 1:
      return {
        intervalDays: clampInterval(Math.max(ivl + 1, Math.round(ivl * HARD_FACTOR))),
        ease: roundEase(Math.max(MIN_EASE, ease - EASE_STEP_HARD)),
      };
    case 2:
      return { intervalDays: clampInterval(Math.max(ivl + 1, Math.round(ivl * ease))), ease };
    case 3: {
      // Easy is computed from the ease the card had before this answer, as Anki does.
      const good = Math.max(ivl + 1, Math.round(ivl * ease));
      return {
        intervalDays: clampInterval(Math.max(good + 1, Math.round(ivl * ease * EASY_BONUS))),
        ease: roundEase(ease + EASE_STEP_EASY),
      };
    }
  }
}

export function schedule(card: CardSchedule, rating: Rating, today: string): CardSchedule {
  const { intervalDays, ease } = nextInterval(card, rating);
  const lapsed = rating === 0 && card.intervalDays > 0;
  return {
    ease,
    intervalDays,
    reps: card.reps + 1,
    lapses: card.lapses + (lapsed ? 1 : 0),
    dueAt: addDays(today, intervalDays),
  };
}

/** What each button will do, for the label shown on it before answering. */
export function previewIntervals(card: CardSchedule): Record<Rating, number> {
  return {
    0: nextInterval(card, 0).intervalDays,
    1: nextInterval(card, 1).intervalDays,
    2: nextInterval(card, 2).intervalDays,
    3: nextInterval(card, 3).intervalDays,
  };
}

export function formatInterval(days: number): string {
  if (days <= 0) return "ôn lại ngay";
  if (days < 30) return `${days} ngày`;
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${String(months).replace(".", ",")} tháng`;
  }
  return "1 năm";
}

// ---- Vietnam calendar days --------------------------------------------------

export const STUDY_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day in Vietnam at `now`, as `YYYY-MM-DD`. */
export function vietnamDay(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Where a failed card goes back into the session queue: after ~3 other cards. */
export const REQUEUE_GAP = 3;

export function requeue<T>(queue: readonly T[], item: T, gap: number = REQUEUE_GAP): T[] {
  const next = [...queue];
  next.splice(Math.min(gap, next.length), 0, item);
  return next;
}
