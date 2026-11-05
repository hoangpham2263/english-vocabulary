
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CARD_STATUS_LABELS, type CardStatus } from "@/lib/study";

const ALL = "all";

export function CardFilters({ q, status, total }: { q: string; status: CardStatus | null; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [, startTransition] = useTransition();

  function push(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    if (text.trim() === q) return;
    const timer = setTimeout(() => push({ q: text.trim() || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Tìm từ hoặc nghĩa"
          className="pl-9"
          aria-label="Tìm thẻ"
        />
      </div>
      <div className="flex items-center gap-2">
        <NativeSelect
          containerClassName="w-40"
          className="h-10"
          value={status ?? ALL}
          onChange={(event) => push({ status: event.target.value === ALL ? null : event.target.value })}
          aria-label="Lọc theo trạng thái"
        >
          <option value={ALL}>Mọi trạng thái</option>
          {Object.entries(CARD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">{total} thẻ</span>
      </div>
    </div>
  );
}
