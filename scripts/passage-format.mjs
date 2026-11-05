// Shape of the passage deck data (data/passages/passages.json), shared by the
// seed, the app and the unit test.

// After the sentence deck on the home page.
export const PASSAGE_DECK = { slug: "luyen-doan", name: "Luyện dịch đoạn văn", position: 11 };

/** Topic names by unit; data/passages/passages.json carries the same list. */
export const PASSAGE_TOPICS = {
  1: "Du lịch",
  2: "Sức khỏe",
  3: "Khoa học và công nghệ",
  4: "Thể thao",
  5: "Thiên nhiên và môi trường",
  6: "Chính trị và xã hội",
  7: "Kinh tế và công việc",
  8: "Lịch sử và địa lý",
  9: "Văn hóa và giải trí",
  10: "Học tập",
  11: "Chủ đề khác",
};

/** The credit FLORES-200's CC BY-SA 4.0 licence asks for, shown on the deck. */
export const PASSAGE_CREDIT = {
  source: "FLORES-200 (Meta), câu gốc từ Wikinews, Wikivoyage, Wikibooks",
  url: "https://github.com/facebookresearch/flores",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

/** Where a passage came from: the article its sentences were taken from. */
export function passageNote(p) {
  return `FLORES-200 · ${p.url}`;
}

/** Returns a list of human-readable problems; empty means the data is valid. */
export function validatePassages(data) {
  const problems = [];
  if (!data || typeof data.topics !== "object" || !Array.isArray(data.passages)) return ["Not a passage deck"];
  if (data.passages.length === 0) problems.push("No passages");
  const seen = new Set();
  data.passages.forEach((p, i) => {
    const where = `passage ${i + 1} (${p?.url ?? "?"})`;
    if (!(String(p?.unit) in data.topics)) problems.push(`${where}: unknown topic`);
    if (!Array.isArray(p?.en) || !Array.isArray(p?.vi) || p.en.length < 2) problems.push(`${where}: fewer than two sentences`);
    else if (p.en.length !== p.vi.length) problems.push(`${where}: English and Vietnamese differ in sentence count`);
    else if ([...p.en, ...p.vi].some((s) => typeof s !== "string" || !s.trim() || s.includes("\n"))) problems.push(`${where}: empty sentence`);
    const key = p?.en?.join("\n");
    if (seen.has(key)) problems.push(`${where}: duplicate`);
    seen.add(key);
  });
  return problems;
}
