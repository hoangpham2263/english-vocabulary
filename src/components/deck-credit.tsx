import type { DeckKind } from "@/lib/deck-kind";
import { PASSAGE_CREDIT } from "../../scripts/passage-format.mjs";
import { SENTENCE_CREDIT } from "../../scripts/sentence-format.mjs";

const CREDITS: Partial<Record<DeckKind, { source: string; url: string; license: string; licenseUrl: string; what: string }>> = {
  sentence: { ...SENTENCE_CREDIT, what: "Câu và bản dịch lấy từ" },
  passage: { ...PASSAGE_CREDIT, what: "Đoạn văn và bản dịch lấy từ" },
};

/** The attribution a deck's licence asks for, under the decks built from open data. */
export function DeckCredit({ kind }: { kind: DeckKind }) {
  const credit = CREDITS[kind];
  if (!credit) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {credit.what}{" "}
      <a href={credit.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
        {credit.source}
      </a>
      , giấy phép{" "}
      <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
        {credit.license}
      </a>
      . Nguồn chi tiết ghi ở từng thẻ.
    </p>
  );
}
