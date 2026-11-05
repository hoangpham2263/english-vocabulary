import { api, ApiError } from "@/lib/api";
import type { AnswerResult, UndoResult } from "@/lib/types";

export type { AnswerResult, UndoResult };

const failed = (error: unknown) => ({ ok: false as const, error: error instanceof ApiError ? error.message : "Có lỗi xảy ra" });

export const answerCard = (input: { cardId: number; rating: number }): Promise<AnswerResult> =>
  api.answer(input.cardId, input.rating).catch(failed);

export const undoAnswer = (reviewId: number): Promise<UndoResult> => api.undo(reviewId).catch(failed);

export const updateDailyNewLimit = async (bucket: string, limit: number) => {
  try {
    const result = await api.setDailyLimit(bucket, limit);
    return result;
  } catch {
    return { ok: false };
  }
};

export const updateAccent = (accent: string) => api.setAccent(accent).catch(() => ({ ok: false }));
