
import { useActionState, useMemo, useState } from "react";
import { importCards, type FormState } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CARD_TYPES, type CardType } from "@/lib/card-types";
import { parseImport } from "@/lib/import";
import { CARD_TYPE_LABELS } from "@/lib/study";

const SAMPLE = `mitigate | giảm nhẹ | Planting trees can mitigate urban heat. | Trồng cây giúp giảm nhiệt đô thị.
in the long run | về lâu dài | It saves money in the long run.`;

export function ImportForm({ deckId }: { deckId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(importCards, null);
  const [text, setText] = useState("");
  const [type, setType] = useState<CardType>("vocab");
  const preview = useMemo(() => parseImport(text), [text]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="deckId" value={deckId} />
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Loại thẻ</Label>
          <NativeSelect id="type" className="h-10" value={type} onChange={(event) => setType(event.target.value as CardType)}>
            {CARD_TYPES.map((value) => (
              <option key={value} value={value}>
                {CARD_TYPE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tag cho cả lô (không bắt buộc)</Label>
          <Input id="tags" name="tags" placeholder="environment, task-2" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Mỗi dòng một thẻ</Label>
        <Textarea
          id="text"
          name="text"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={SAMPLE}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Thứ tự cột: mặt trước | mặt sau | ví dụ | dịch ví dụ | phiên âm. Chỉ hai cột đầu là bắt buộc. Dán từ Excel hoặc Google Sheets
          (cách nhau bằng tab) cũng được. Dòng bắt đầu bằng # sẽ bị bỏ qua.
        </p>
      </div>

      {text.trim() && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            Sẽ nhập <b>{preview.drafts.length}</b> thẻ
            {preview.errors.length > 0 && <span className="text-destructive">, {preview.errors.length} dòng lỗi</span>}
          </p>
          {preview.errors.slice(0, 5).map((error) => (
            <p key={error.line} className="text-xs text-destructive">
              Dòng {error.line}: {error.reason}
            </p>
          ))}
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-rate-good">{state.message}</p>}

      <Button type="submit" disabled={pending || preview.drafts.length === 0}>
        {pending ? "Đang nhập..." : `Nhập ${preview.drafts.length} thẻ`}
      </Button>
    </form>
  );
}
