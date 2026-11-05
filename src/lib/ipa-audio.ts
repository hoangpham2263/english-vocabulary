import audio from "./ipa-audio.json";
import type { Accent } from "@/lib/accent";
import { BASE_PATH } from "@/lib/base-path";

// Each sound of the chart, cut from a key word said by the built-in macOS
// voices (Samantha for US, Daniel for UK) by scripts/build-ipa-audio.py. One
// set per accent, so the accent switch changes the sound too.

type SoundAudio = { word: string; us: string; uk: string };
const sounds: Record<string, SoundAudio> = audio.sounds;

/** "/iː/" → "iː" */
export function symbolOf(front: string): string {
  return front.replace(/^\/|\/$/g, "").trim();
}

export function soundAudioUrl(front: string, accent: Accent): string | null {
  const sound = sounds[symbolOf(front)];
  return sound ? `${BASE_PATH}/audio/ipa/${sound[accent]}` : null;
}
