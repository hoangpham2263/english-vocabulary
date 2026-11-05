// Turns pasted text into card drafts. One card per line, fields separated by a
// tab (pasted from a spreadsheet) or by " | ":
//
//   front | back | example | example translation | ipa
//
// Only front and back are required. Lines starting with # are comments.

export type CardDraft = {
  front: string;
  back: string;
  example: string | null;
  exampleVi: string | null;
  ipa: string | null;
};

export type ParseResult = {
  drafts: CardDraft[];
  errors: { line: number; text: string; reason: string }[];
};

export const MAX_IMPORT_LINES = 1000;
export const MAX_FIELD_LENGTH = 2000;

function splitLine(line: string): string[] {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  return parts.map((part) => part.trim());
}

const optional = (value: string | undefined) => (value && value.length > 0 ? value : null);

export function parseImport(text: string): ParseResult {
  const drafts: CardDraft[] = [];
  const errors: ParseResult["errors"] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const lineNumber = index + 1;
    if (line === "" || line.startsWith("#")) return;

    if (drafts.length >= MAX_IMPORT_LINES) {
      errors.push({ line: lineNumber, text: line, reason: `Tối đa ${MAX_IMPORT_LINES} dòng mỗi lần` });
      return;
    }

    const [front, back, example, exampleVi, ipa] = splitLine(line);
    if (!front || !back) {
      errors.push({ line: lineNumber, text: line, reason: "Cần ít nhất mặt trước và mặt sau" });
      return;
    }
    if ([front, back, example, exampleVi, ipa].some((field) => (field?.length ?? 0) > MAX_FIELD_LENGTH)) {
      errors.push({ line: lineNumber, text: line, reason: "Nội dung quá dài" });
      return;
    }
    const key = front.toLowerCase();
    if (seen.has(key)) {
      errors.push({ line: lineNumber, text: line, reason: "Trùng với một dòng phía trên" });
      return;
    }
    seen.add(key);
    drafts.push({ front, back, example: optional(example), exampleVi: optional(exampleVi), ipa: optional(ipa) });
  });

  return { drafts, errors };
}
