// Shape of the translation deck data (data/sentences/sentences.json), shared
// by the seed, the app and the unit test.

// After the six books on the home page.
export const SENTENCE_DECK = { slug: "luyen-dich", name: "Luyện dịch câu", position: 10 };

/** Topic names by unit; data/sentences/sentences.json carries the same list. */
export const SENTENCE_TOPICS = {
  1: "Chào hỏi và giao tiếp",
  2: "Gia đình và bạn bè",
  3: "Nhà cửa và sinh hoạt",
  4: "Ăn uống",
  5: "Mua sắm và tiền bạc",
  6: "Trường học",
  7: "Ngôn ngữ và đọc sách",
  8: "Công việc",
  9: "Đi lại và du lịch",
  10: "Sức khỏe",
  11: "Thời tiết và thiên nhiên",
  12: "Động vật",
  13: "Thời gian và lịch",
  14: "Cảm xúc",
  15: "Sở thích và thể thao",
};

/** The credit Tatoeba's CC BY 2.0 FR licence asks for, shown on the deck. */
export const SENTENCE_CREDIT = {
  source: "Tatoeba",
  url: "https://tatoeba.org",
  license: "CC BY 2.0 FR",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
};

/** Where one sentence pair came from: both Tatoeba ids and their authors. */
export function sentenceNote(s) {
  const by = (id, author) => `#${id}${author ? ` (${author})` : ""}`;
  return `Tatoeba ${by(s.enId, s.enAuthor)} · ${by(s.viId, s.viAuthor)}`;
}

/** Returns a list of human-readable problems; empty means the data is valid. */
export function validateSentences(data) {
  const problems = [];
  if (!data || typeof data.topics !== "object" || !Array.isArray(data.sentences)) return ["Not a sentence deck"];
  if (data.sentences.length === 0) problems.push("No sentences");
  const seen = new Set();
  data.sentences.forEach((s, i) => {
    const where = `sentence ${i + 1} (${s?.en ?? "?"})`;
    if (!(String(s?.unit) in data.topics)) problems.push(`${where}: unknown topic`);
    for (const field of ["en", "vi"]) {
      if (typeof s?.[field] !== "string" || !s[field].trim()) problems.push(`${where}: empty ${field}`);
    }
    if (!Number.isInteger(s?.enId) || !Number.isInteger(s?.viId)) problems.push(`${where}: missing Tatoeba id`);
    if (seen.has(s?.en)) problems.push(`${where}: duplicate`);
    seen.add(s?.en);
  });
  return problems;
}
