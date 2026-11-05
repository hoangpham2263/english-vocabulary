// Shape of the IPA chart data, shared by the seed and the unit test.

// Position 0 puts the sound chart before Book 1 on the home page.
export const IPA_DECK = { slug: "ipa", name: "Bảng phiên âm IPA", position: 0 };
export const IPA_UNITS = {
  1: "Nguyên âm đơn",
  2: "Nguyên âm đôi",
  3: "Phụ âm theo cặp",
  4: "Phụ âm còn lại",
};
export const IPA_SOUND_COUNT = 44;

export function validateIpa(sounds) {
  const problems = [];
  if (!Array.isArray(sounds)) return ["IPA data is not an array"];
  if (sounds.length !== IPA_SOUND_COUNT) problems.push(`Expected ${IPA_SOUND_COUNT} sounds, found ${sounds.length}`);
  const seen = new Set();
  sounds.forEach((sound, i) => {
    const where = `sound ${i + 1} (${sound?.symbol ?? "?"})`;
    if (!(sound?.unit in IPA_UNITS)) problems.push(`${where}: unknown unit`);
    for (const field of ["symbol", "vi", "tip"]) {
      if (typeof sound?.[field] !== "string" || !sound[field].trim()) problems.push(`${where}: empty ${field}`);
    }
    if (!Array.isArray(sound?.examples) || sound.examples.length === 0) problems.push(`${where}: no examples`);
    if (sound?.examples?.length !== sound?.examplesIpa?.length) problems.push(`${where}: examples and IPA differ in length`);
    if (seen.has(sound?.symbol)) problems.push(`${where}: duplicate symbol`);
    seen.add(sound?.symbol);
  });
  return problems;
}
