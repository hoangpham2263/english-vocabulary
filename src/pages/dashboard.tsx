import { BookOpenIcon, FlameIcon, RotateCcwIcon } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { DailyLimitSelect } from "@/components/daily-limit-select";
import { ForecastChart } from "@/components/forecast-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DECK_GROUPS, deckBucket, deckGroup } from "@/lib/deck-kind";
import { Link } from "@/lib/router";
import { NEW_BUCKETS, NEW_BUCKET_INFO } from "@/lib/study";
import type { Dashboard } from "@/lib/types";
import { DataPage } from "@/lib/use-data";
import { Loading } from "@/pages/loading";
import { NotFound } from "@/pages/not-found";

function greeting(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
  return `${weekday}, ${d}/${m}`;
}

function Content({ data: { today, decks, due, quotas, streak, reviewedToday, forecast } }: { data: Dashboard }) {
  // Each course draws on its own kind's daily quota: words never use up sentences.
  const canLearnDeck = (slug: string) => quotas[deckBucket(slug)].remaining > 0;
  const canLearn = decks.some((deck) => deck.newCount > 0 && canLearnDeck(deck.slug));
  // Everything happens inside a book: point at the first one with reviews due,
  // then the first one with new cards left within its quota, in course order.
  const reviewDeck = decks.find((deck) => deck.due > 0);
  const learnDeck = decks.find((deck) => deck.newCount > 0 && canLearnDeck(deck.slug));
  // Only the kinds this notebook has courses for.
  const buckets = NEW_BUCKETS.filter((bucket) => decks.some((deck) => deckBucket(deck.slug) === bucket));

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-6 bg-gradient-to-br from-[#2f86f6] via-primary to-primary-edge px-4 pb-8 pt-6 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white/90">{greeting(today)}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {due > 0 ? `Có ${due} thẻ đang chờ bạn ôn` : canLearn ? "Sẵn sàng học bài mới?" : "Hôm nay xong rồi!"}
              </h1>
              <p className="text-sm text-white/90">Ôn trước, học mới sau. Mỗi ngày một chút là đủ.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {reviewDeck && (
                <Button asChild size="lg" variant="light" className="h-auto min-h-12 max-w-full whitespace-normal py-2.5 text-left">
                  <Link href={`/${reviewDeck.slug}/review`}>
                    <RotateCcwIcon />
                    Ôn {reviewDeck.due} thẻ · {reviewDeck.name}
                  </Link>
                </Button>
              )}
              {learnDeck && (
                <Button asChild size="lg" variant={reviewDeck ? "blue" : "light"} className="h-auto min-h-12 max-w-full whitespace-normal py-2.5 text-left">
                  <Link href={`/${learnDeck.slug}/learn`}>
                    <BookOpenIcon />
                    Học tiếp · {learnDeck.name}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="w-full space-y-3 rounded-2xl bg-navy-soft px-5 py-4 sm:w-80">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Học mới hôm nay</p>
            <ul className="space-y-2.5">
              {buckets.map((bucket) => {
                const quota = quotas[bucket];
                return (
                  <li key={bucket} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <b>{NEW_BUCKET_INFO[bucket].label}</b>{" "}
                        <span className="tabular-nums text-white/90">
                          {quota.learned}/{quota.limit}
                        </span>
                      </span>
                      <DailyLimitSelect bucket={bucket} value={quota.limit} />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${Math.min(100, (quota.learned / quota.limit) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 whitespace-nowrap border-t border-white/20 pt-3 text-sm">
              <span className="flex items-center gap-1.5" title="Chuỗi ngày học liên tiếp">
                <FlameIcon className="size-5 fill-orange-400 text-orange-400" />
                <b className="tabular-nums">{streak}</b> ngày
              </span>
              <span className="text-white/90" title="Số lượt chấm hôm nay">
                <b className="text-white tabular-nums">{reviewedToday}</b> lượt ôn
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Khoá học của bạn</h2>
          <CreateDeckDialog />
        </div>
        {decks.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa có khoá học nào. Tạo bộ thẻ đầu tiên để bắt đầu.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {DECK_GROUPS.map((group) => {
              const members = decks.filter((deck) => deckGroup(deck.slug) === group.key);
              if (members.length === 0) return null;
              const groupDue = members.reduce((sum, deck) => sum + deck.due, 0);
              return (
                <div key={group.key} className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b pb-2">
                    <div>
                      <h3 className="text-lg font-bold">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {members.length} khoá
                      {groupDue > 0 && <span className="font-semibold text-rate-good"> · {groupDue} cần ôn</span>}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {members.map((deck, index) => (
                      <CourseCard key={deck.id} deck={deck} index={index} canLearn={canLearnDeck(deck.slug)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Lịch ôn 7 ngày tới</CardTitle>
          <CardDescription>Số thẻ đến hạn mỗi ngày, thẻ quá hạn được tính vào hôm nay</CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastChart data={forecast} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Vào từng khoá để học từ mới, ôn đến hạn và luyện tập. Trong màn ôn: Space để lật thẻ, phím 1 đến 4 để chấm, Z để hoàn tác
      </p>
    </div>
  );
}

export function DashboardPage() {
  return (
    <DataPage dataKey="dashboard" load={api.dashboard} fallback={<Loading />} notFound={<NotFound />}>
      {(data) => <Content data={data} />}
    </DataPage>
  );
}
