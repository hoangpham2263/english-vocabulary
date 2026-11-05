// Every call to the Worker API goes through here.
import type { Accent } from "@/lib/accent";
import type { AnswerResult, Card, Dashboard, Deck, DeckPageData, Me, PracticePageData, StudyPageData, UndoResult, UnitPageData } from "@/lib/types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";
const TOKEN_KEY = "english_vocabulary_token";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token = readToken();
const listeners = new Set<() => void>();

export const getToken = () => token;

export function setToken(next: string | null) {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the session lasts until the tab closes.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToken(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    // An expired session sends the app back to the login page.
    if (response.status === 401 && path !== "/login") setToken(null);
    throw new ApiError(response.status, data?.error ?? "Có lỗi xảy ra");
  }
  return data as T;
}

const enc = encodeURIComponent;
const qs = (params: URLSearchParams) => {
  const text = params.toString();
  return text ? `?${text}` : "";
};

export const api = {
  login: (username: string, password: string) => request<{ token: string }>("POST", "/login", { username, password }),
  me: () => request<Me>("GET", "/me"),
  dashboard: () => request<Dashboard>("GET", "/dashboard"),
  deck: (slug: string) => request<Deck>("GET", `/decks/${enc(slug)}/basic`),
  deckPage: (slug: string, params: URLSearchParams) => request<DeckPageData>("GET", `/decks/${enc(slug)}${qs(params)}`),
  unitPage: (slug: string, unit: string) => request<UnitPageData>("GET", `/decks/${enc(slug)}/units/${enc(unit)}`),
  studyPage: (slug: string, mode: "learn" | "review", unit: number | null) =>
    request<StudyPageData>("GET", `/decks/${enc(slug)}/study?mode=${mode}${unit ? `&unit=${unit}` : ""}`),
  practicePage: (slug: string, params: URLSearchParams) => request<PracticePageData>("GET", `/decks/${enc(slug)}/practice${qs(params)}`),
  card: (id: number) => request<Card>("GET", `/cards/${id}`),
  createDeck: (name: string, slug: string | undefined) => request<{ slug: string }>("POST", "/decks", { name, slug }),
  saveCard: (input: Record<string, unknown>) => request<{ slug: string; front: string }>("POST", "/cards", input),
  deleteCard: (id: number) => request<{ slug: string }>("DELETE", `/cards/${id}`),
  importCards: (input: Record<string, unknown>) => request<{ message: string }>("POST", "/cards/import", input),
  answer: (cardId: number, rating: number) => request<AnswerResult>("POST", "/answers", { cardId, rating }),
  undo: (reviewId: number) => request<UndoResult>("DELETE", `/answers/${reviewId}`),
  setAccent: (accent: Accent | string) => request<{ ok: boolean }>("PUT", "/settings/accent", { accent }),
  setDailyLimit: (bucket: string, limit: number) => request<{ ok: boolean }>("PUT", "/settings/daily-limit", { bucket, limit }),
};
