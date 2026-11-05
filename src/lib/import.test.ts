import { describe, expect, it } from "vitest";
import { parseImport } from "./import";

describe("parseImport", () => {
  it("reads pipe-separated lines with optional fields", () => {
    const { drafts, errors } = parseImport(
      "mitigate | giảm nhẹ | Trees mitigate heat. | Cây giúp giảm nóng. | ˈmɪtɪɡeɪt\nsustain | duy trì",
    );
    expect(errors).toEqual([]);
    expect(drafts).toEqual([
      { front: "mitigate", back: "giảm nhẹ", example: "Trees mitigate heat.", exampleVi: "Cây giúp giảm nóng.", ipa: "ˈmɪtɪɡeɪt" },
      { front: "sustain", back: "duy trì", example: null, exampleVi: null, ipa: null },
    ]);
  });

  it("reads tab-separated lines pasted from a spreadsheet", () => {
    const { drafts } = parseImport("in the long run\tvề lâu dài\tIt pays off in the long run.");
    expect(drafts[0]).toMatchObject({ front: "in the long run", back: "về lâu dài", example: "It pays off in the long run." });
  });

  it("keeps a pipe inside a tab-separated field", () => {
    const { drafts } = parseImport("either | or\thoặc cái này hoặc cái kia");
    expect(drafts[0]?.front).toBe("either | or");
  });

  it("skips blanks and comments, reports incomplete and duplicate lines", () => {
    const { drafts, errors } = parseImport("# Unit 1\n\nabandon | từ bỏ\nlonely\nAbandon | bỏ rơi");
    expect(drafts).toHaveLength(1);
    expect(errors.map((e) => [e.line, e.reason])).toEqual([
      [4, "Cần ít nhất mặt trước và mặt sau"],
      [5, "Trùng với một dòng phía trên"],
    ]);
  });
});
