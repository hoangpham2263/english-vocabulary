import { CardForm } from "@/components/card-form";
import { ImportForm } from "@/components/import-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { Link, useParams } from "@/lib/router";
import { formatInterval } from "@/lib/srs";
import { CARD_STATUS_LABELS, cardStatus } from "@/lib/study";
import { DataPage } from "@/lib/use-data";
import { Loading } from "@/pages/loading";
import { NotFound } from "@/pages/not-found";

function Crumb({ slug, name, label }: { slug: string; name: string; label: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      <Link href={`/${slug}`} className="hover:underline">
        {name}
      </Link>{" "}
      / {label}
    </p>
  );
}

export function NewCardPage() {
  const slug = useParams().deck!;
  return (
    <DataPage dataKey={`deck:${slug}`} load={() => api.deck(slug)} fallback={<Loading />} notFound={<NotFound />}>
      {(deck) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <Crumb slug={deck.slug} name={deck.name} label="Thêm thẻ" />
          <Card>
            <CardHeader>
              <CardTitle>Thêm thẻ mới</CardTitle>
            </CardHeader>
            <CardContent>
              <CardForm deckId={deck.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </DataPage>
  );
}

export function ImportPage() {
  const slug = useParams().deck!;
  return (
    <DataPage dataKey={`deck:${slug}`} load={() => api.deck(slug)} fallback={<Loading />} notFound={<NotFound />}>
      {(deck) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <Crumb slug={deck.slug} name={deck.name} label="Nhập nhiều thẻ" />
          <Card>
            <CardHeader>
              <CardTitle>Nhập nhiều thẻ</CardTitle>
              <CardDescription>Thẻ đã có trong bộ chỉ được cập nhật nội dung, lịch ôn giữ nguyên.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm deckId={deck.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </DataPage>
  );
}

async function loadEdit(slug: string, cardId: string | undefined) {
  const id = Number(cardId);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(404, "Không tìm thấy thẻ");
  const [deck, card] = await Promise.all([api.deck(slug), api.card(id)]);
  if (card.deckId !== deck.id) throw new ApiError(404, "Không tìm thấy thẻ");
  return { deck, card };
}

export function EditCardPage() {
  const { deck: slug, cardId } = useParams();
  return (
    <DataPage dataKey={`edit:${slug}:${cardId}`} load={() => loadEdit(slug!, cardId)} fallback={<Loading />} notFound={<NotFound />}>
      {({ deck, card }) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <Crumb slug={deck.slug} name={deck.name} label="Sửa thẻ" />
          <Card>
            <CardHeader>
              <CardTitle>{card.front}</CardTitle>
              <CardDescription>
                {CARD_STATUS_LABELS[cardStatus(card)]}
                {card.dueAt &&
                  ` · ôn tiếp ngày ${card.dueAt.split("-").reverse().join("/")} · khoảng ${formatInterval(card.intervalDays)} · đã ôn ${card.reps} lần, quên ${card.lapses} lần`}
                . Sửa nội dung không làm thay đổi lịch ôn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardForm deckId={deck.id} card={card} />
            </CardContent>
          </Card>
        </div>
      )}
    </DataPage>
  );
}
