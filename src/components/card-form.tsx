
import { Trash2Icon } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCard, saveCard, type FormState } from "@/actions/cards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Card } from "@/lib/types";
import { CARD_TYPES, type CardType } from "@/lib/card-types";
import { CARD_TYPE_LABELS } from "@/lib/study";

// What each field means for each card type, so a Speaking card does not ask for "IPA".
const FIELD_HINTS: Record<CardType, { front: string; back: string; example: string }> = {
  vocab: { front: "Từ tiếng Anh", back: "Nghĩa tiếng Việt", example: "Câu ví dụ" },
  idiom: { front: "Idiom hoặc phrasal verb", back: "Nghĩa", example: "Câu ví dụ" },
  grammar: { front: "Cấu trúc", back: "Cách dùng", example: "Câu mẫu" },
  writing: { front: "Đề bài", back: "Dàn ý, ý chính", example: "Câu mở bài hoặc câu hay" },
  speaking: { front: "Câu hỏi", back: "Ý trả lời", example: "Cụm từ nên dùng" },
  sound: { front: "Ký hiệu IPA", back: "Cách đọc", example: "Từ ví dụ, cách nhau bằng dấu phẩy" },
  sentence: { front: "Câu tiếng Anh", back: "Bản dịch tiếng Việt", example: "Ghi chú thêm" },
  passage: { front: "Đoạn tiếng Anh, mỗi câu một dòng", back: "Bản dịch, mỗi câu một dòng, cùng số dòng", example: "Ghi chú thêm" },
};

export function CardForm({ deckId, card }: { deckId: number; card?: Card }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const [type, setType] = useState<CardType>(card?.type ?? "vocab");
  const [deleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const hints = FIELD_HINTS[type];

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.message) {
      toast.success(state.message);
      formRef.current?.reset();
      formRef.current?.querySelector<HTMLInputElement>("[name=front]")?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="deckId" value={deckId} />
      {card && <input type="hidden" name="cardId" value={card.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="space-y-2">
        <Label htmlFor="type">Loại thẻ</Label>
        <NativeSelect
          id="type"
          containerClassName="w-48"
          className="h-10"
          value={type}
          onChange={(event) => setType(event.target.value as CardType)}
        >
          {CARD_TYPES.map((value) => (
            <option key={value} value={value}>
              {CARD_TYPE_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="front">Mặt trước · {hints.front}</Label>
          <Input id="front" name="front" defaultValue={card?.front} required maxLength={500} autoFocus={!card} />
        </div>
        {(type === "vocab" || type === "idiom") && (
          <div className="space-y-2">
            <Label htmlFor="ipa">Phiên âm IPA</Label>
            <Input id="ipa" name="ipa" defaultValue={card?.ipa ?? ""} placeholder="əˈfreɪd" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="back">Mặt sau · {hints.back}</Label>
        <Textarea id="back" name="back" defaultValue={card?.back} required rows={type === "writing" || type === "speaking" ? 5 : 2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="example">{hints.example}</Label>
          <Textarea id="example" name="example" defaultValue={card?.example ?? ""} rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exampleVi">Dịch câu ví dụ</Label>
          <Textarea id="exampleVi" name="exampleVi" defaultValue={card?.exampleVi ?? ""} rows={2} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea id="note" name="note" defaultValue={card?.note ?? ""} rows={2} placeholder="Collocation, từ đồng nghĩa, lỗi hay gặp" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tag (cách nhau bằng dấu phẩy)</Label>
          <Input id="tags" name="tags" defaultValue={card?.tags.join(", ") ?? ""} placeholder="unit-01, environment" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : card ? "Lưu thay đổi" : "Thêm thẻ"}
        </Button>
        {!card && (
          <Button type="submit" name="next" value="again" variant="outline" disabled={pending}>
            Thêm và nhập tiếp
          </Button>
        )}
        {card && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="ml-auto text-destructive hover:text-destructive" disabled={deleting}>
                <Trash2Icon />
                Xoá thẻ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xoá thẻ &quot;{card.front}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>Lịch ôn và lịch sử chấm của thẻ này cũng bị xoá. Không hoàn tác được.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:brightness-90"
                  onClick={() => startDelete(() => deleteCard(card.id))}
                >
                  Xoá
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}
