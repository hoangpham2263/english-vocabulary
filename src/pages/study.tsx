import { InfoIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { StudySession } from "@/components/study-session";
import { StudySkeleton } from "@/components/study-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { deckBucket, deckKind, unitName } from "@/lib/deck-kind";
import { Link, useParams } from "@/lib/router";
import { NEW_BUCKET_INFO, parseUnit } from "@/lib/study";
import { DataPage } from "@/lib/use-data";
import { NotFound } from "@/pages/not-found";

export function StudyPage({ mode }: { mode: "learn" | "review" }) {
  const slug = useParams().deck!;
  const [params] = useSearchParams();
  const unit = parseUnit(params.get("unit") ?? undefined);

  return (
    <DataPage
      dataKey={`study:${mode}:${slug}:${unit}`}
      load={() => api.studyPage(slug, mode, unit)}
      fallback={<StudySkeleton />}
      notFound={<NotFound />}
    >
      {({ deck, cards, quota, due }) => {
        const kind = deckKind(deck.slug);
        const bucket = deckBucket(deck.slug);
        const suffix = unit ? `?unit=${unit}` : "";
        const title = unit ? `${deck.name} · ${unitName(kind, unit)}` : deck.name;
        const backHref = unit ? `/${deck.slug}/unit/${unit}` : `/${deck.slug}`;
        const backLabel = unit ? `Về ${unitName(kind, unit)}` : "Về khoá học";
        const reviewHref = `/${deck.slug}/review${suffix}`;

        if (mode === "review") {
          return (
            <div className="space-y-4">
              <h1 className="text-center text-sm font-medium text-muted-foreground">{title}</h1>
              {/* A new key per load, so returning to the page starts a fresh session. */}
              <StudySession key={cards.map((c) => c.id).join()} cards={cards} mode="review" backHref={backHref} backLabel={backLabel} />
            </div>
          );
        }

        if (quota.remaining === 0) {
          return (
            <Card className="mx-auto max-w-md text-center">
              <CardContent className="space-y-3 py-6">
                <p className="text-lg font-semibold">
                  Đã học đủ {quota.limit} {NEW_BUCKET_INFO[bucket].noun} mới hôm nay
                </p>
                <p className="text-sm text-muted-foreground">
                  Học dồn nhiều từ mới sẽ làm lượng ôn những ngày sau tăng nhanh. Muốn học thêm, đổi giới hạn ở trang tổng quan.
                </p>
                <Button asChild>
                  <Link href={due > 0 ? reviewHref : backHref}>{due > 0 ? `Ôn ${due} thẻ đến hạn` : backLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-4">
            <h1 className="text-center text-sm font-medium text-muted-foreground">
              {title} · còn {quota.remaining}/{quota.limit} {NEW_BUCKET_INFO[bucket].noun} mới hôm nay
            </h1>
            {due > 0 && (
              <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-rate-hard/30 bg-rate-hard/10 px-4 py-3 text-sm">
                <InfoIcon className="size-4 shrink-0 text-rate-hard" />
                <span>Còn {due} thẻ đến hạn. Nên ôn trước rồi mới học từ mới.</span>
                <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
                  <Link href={reviewHref}>Ôn trước</Link>
                </Button>
              </div>
            )}
            <StudySession key={cards.map((c) => c.id).join()} cards={cards} mode="learn" backHref={backHref} backLabel={backLabel} />
          </div>
        );
      }}
    </DataPage>
  );
}
