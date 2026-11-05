import { useSearchParams } from "react-router";
import { PracticeSession } from "@/components/practice/practice-session";
import { StudySkeleton } from "@/components/study-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ITEM_NOUN, deckKind, unitName } from "@/lib/deck-kind";
import { ENDLESS_PRACTICE, PRACTICE_MODE_LABELS, modesFor, type PracticeMode } from "@/lib/practice";
import { Link, useParams } from "@/lib/router";
import { parseUnit } from "@/lib/study";
import { DataPage } from "@/lib/use-data";
import { NotFound } from "@/pages/not-found";

export function PracticePage() {
  const slug = useParams().deck!;
  const [params] = useSearchParams();

  return (
    <DataPage
      dataKey={`practice:${slug}:${params.toString()}`}
      load={() => api.practicePage(slug, params)}
      fallback={<StudySkeleton />}
      notFound={<NotFound />}
    >
      {({ deck, cards, quiz, glossary }) => {
        const kind = deckKind(deck.slug);
        const noun = ITEM_NOUN[kind];
        const rawMode = params.get("mode");
        const mode: PracticeMode = modesFor(kind).includes(rawMode as PracticeMode) ? (rawMode as PracticeMode) : "flashcard";
        const source = params.get("source") === "all" ? "all" : "learned";
        const endless = params.get("count") === String(ENDLESS_PRACTICE);
        const unit = parseUnit(params.get("unit") ?? undefined);
        const backHref = unit ? `/${deck.slug}/unit/${unit}` : `/${deck.slug}`;
        const scope = [deck.name, unit ? unitName(kind, unit) : null, source === "learned" ? `${noun} đã học` : `tất cả ${noun}`]
          .filter(Boolean)
          .join(" · ");

        if (cards.length === 0) {
          return (
            <Card className="mx-auto max-w-md rounded-3xl text-center">
              <CardContent className="space-y-3 py-6">
                <p className="text-lg font-bold">Chưa có {noun} nào để luyện</p>
                <p className="text-sm text-muted-foreground">
                  {source === "learned"
                    ? `Phạm vi này chưa có ${noun} nào đã học. Học vài ${noun} mới trước, hoặc chọn "Tất cả ${noun}".`
                    : "Phạm vi này chưa có thẻ nào."}
                </p>
                <Button asChild>
                  <Link href={backHref}>{unit ? `Về ${unitName(kind, unit)}` : "Về khoá học"}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-lg font-bold">{PRACTICE_MODE_LABELS[mode].title}</h1>
              <p className="text-sm text-muted-foreground">
                {scope} · {cards.length} {noun} {endless ? "lặp vô hạn" : "ngẫu nhiên"}
              </p>
            </div>
            {/* A fresh draw (router.refresh) brings new ids, so the session restarts. */}
            <PracticeSession key={cards.map((c) => c.id).join()} cards={cards} quiz={quiz} glossary={glossary} mode={mode} endless={endless} backHref={backHref} />
          </div>
        );
      }}
    </DataPage>
  );
}
