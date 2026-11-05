import { CircleDashedIcon, Flower2Icon, LeafIcon, SproutIcon } from "lucide-react";
import { CARD_STATUS_LABELS, type CardStatus } from "@/lib/study";
import { cn } from "@/lib/utils";

// Memory strength drawn as a plant growing, as Memrise does: a seed not yet
// planted, a sprout still being learned, leaves under review, a flower once known.
const PLANTS: Record<CardStatus, { icon: typeof SproutIcon; className: string }> = {
  new: { icon: CircleDashedIcon, className: "text-plant-seed" },
  learning: { icon: SproutIcon, className: "text-plant-sprout" },
  young: { icon: LeafIcon, className: "text-plant-grown" },
  mature: { icon: Flower2Icon, className: "text-plant-flower" },
};

export function PlantIcon({ status, className }: { status: CardStatus; className?: string }) {
  const { icon: Icon, className: tone } = PLANTS[status];
  return (
    <span title={CARD_STATUS_LABELS[status]} className="inline-flex">
      <Icon className={cn("size-5", tone, className)} aria-label={CARD_STATUS_LABELS[status]} />
    </span>
  );
}
