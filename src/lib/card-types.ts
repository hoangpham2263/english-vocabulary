// Client-safe: imported by forms as well as by the database schema.
export const CARD_TYPES = ["vocab", "grammar", "writing", "speaking", "idiom", "sound", "sentence", "passage"] as const;
export type CardType = (typeof CARD_TYPES)[number];
