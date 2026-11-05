// The learner's accent, US or UK. It drives every voice in the app (browser
// speech and the pronunciation recogniser) and which IPA is shown. Stored in the
// database so phone and laptop agree; mirrored here for the client.

export const ACCENTS = ["us", "uk"] as const;
export type Accent = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: Accent = "us";

export const ACCENT_LABELS: Record<Accent, { short: string; long: string }> = {
  us: { short: "US", long: "giọng Mỹ" },
  uk: { short: "UK", long: "giọng Anh" },
};

export const ACCENT_LANG: Record<Accent, string> = { us: "en-US", uk: "en-GB" };

/** Natural-sounding voices first; any voice of the right locale after that. */
export const PREFERRED_VOICES: Record<Accent, RegExp> = {
  us: /Google US|Samantha|Aria|Jenny|Natural|Ava|Allison/i,
  uk: /Google UK|Daniel|Serena|Kate|Arthur|Libby|Sonia|Ryan|Natural/i,
};

export function isAccent(value: unknown): value is Accent {
  return ACCENTS.includes(value as Accent);
}

// Client-side store, so `speak()` (a plain function) and React components both
// read the same current accent.
let current: Accent = DEFAULT_ACCENT;
const listeners = new Set<() => void>();

export function getAccent(): Accent {
  return current;
}

export function setAccentLocal(accent: Accent) {
  if (accent === current) return;
  current = accent;
  listeners.forEach((listener) => listener());
}

export function subscribeAccent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The IPA to show for the chosen accent, falling back to US when UK is missing. */
export function ipaFor(card: { ipa: string | null; ipaUk?: string | null }, accent: Accent): string | null {
  if (accent === "uk") return card.ipaUk || card.ipa;
  return card.ipa;
}
