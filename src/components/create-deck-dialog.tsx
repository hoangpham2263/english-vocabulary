
import { PlusIcon } from "lucide-react";
import { useActionState } from "react";
import { createDeck, type FormState } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateDeckDialog() {
  const [state, action, pending] = useActionState<FormState, FormData>(createDeck, null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon />
          Bộ thẻ mới
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Tạo bộ thẻ</DialogTitle>
            <DialogDescription>Ví dụ: Writing Task 2, Speaking Part 1, Linking words.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deck-name">Tên bộ thẻ</Label>
            <Input id="deck-name" name="name" required maxLength={120} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deck-slug">Đường dẫn (không bắt buộc)</Label>
            <Input id="deck-slug" name="slug" placeholder="tự tạo từ tên" maxLength={60} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang tạo..." : "Tạo bộ thẻ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
