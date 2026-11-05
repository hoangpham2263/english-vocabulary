
import { useTransition } from "react";
import { toast } from "sonner";
import { updateDailyNewLimit } from "@/actions/study";
import { refreshData } from "@/lib/use-data";
import { NativeSelect } from "@/components/ui/native-select";
import { NEW_BUCKET_INFO, type NewBucket } from "@/lib/study";

/** The daily new-card limit of one kind (words, sounds, sentences or passages). */
export function DailyLimitSelect({ bucket, value }: { bucket: NewBucket; value: number }) {
  const [pending, startTransition] = useTransition();
  const { noun, limits } = NEW_BUCKET_INFO[bucket];

  return (
    <NativeSelect
      value={String(value)}
      disabled={pending}
      title={`Số ${noun} mới mỗi ngày`}
      aria-label={`Số ${noun} mới mỗi ngày`}
      containerClassName="w-auto"
      className="h-7 border-transparent pl-2 pr-7 text-xs font-semibold text-foreground focus-visible:border-white"
      iconClassName="right-2 size-3.5"
      onChange={(event) => {
        const next = event.target.value;
        startTransition(async () => {
          const result = await updateDailyNewLimit(bucket, Number(next));
          if (result.ok) {
            toast.success(`Mỗi ngày học ${next} ${noun} mới`);
            refreshData();
          } else toast.error("Không đổi được giới hạn");
        });
      }}
    >
      {limits.map((limit) => (
        <option key={limit} value={String(limit)}>
          {limit} {noun}/ngày
        </option>
      ))}
    </NativeSelect>
  );
}
