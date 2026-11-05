
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { usePathname, useSearchParams } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (target: number) => {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span className="tabular-nums">
        Trang {page}/{pages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link href={href(page - 1)} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <ChevronLeftIcon />
            Trước
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            href={href(page + 1)}
            aria-disabled={page >= pages}
            className={page >= pages ? "pointer-events-none opacity-50" : ""}
          >
            Sau
            <ChevronRightIcon />
          </Link>
        </Button>
      </div>
    </div>
  );
}
