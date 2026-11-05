import { Skeleton } from "@/components/ui/skeleton";

export function StudySkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true" aria-label="Đang tải thẻ">
      <Skeleton className="mx-auto h-4 w-40" />
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-[22rem] w-full rounded-xl" />
    </div>
  );
}
