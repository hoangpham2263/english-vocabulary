
import { CheckIcon, EyeIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CardBack, CardFront } from "@/components/practice/card-face";
import type { DrillProps } from "@/components/practice/practice-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FlashcardDrill({ card, onResult }: DrillProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (flipped && event.key === "1") onResult(false);
      else if (flipped && event.key === "2") onResult(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, onResult]);

  return (
    <div className="space-y-4">
      <Card className="min-h-80 rounded-3xl border py-0">
        <CardContent className="space-y-4 px-5 py-5 sm:px-8">
          <CardFront card={card} />
          {flipped ? (
            <CardBack card={card} />
          ) : (
            <div className="flex justify-center pt-2">
              <Button size="lg" className="w-full sm:w-72" onClick={() => setFlipped(true)}>
                <EyeIcon />
                Lật thẻ
                <kbd className="ml-1 rounded-md bg-white/20 px-1.5 text-[11px]">Space</kbd>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {flipped && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="again" onClick={() => onResult(false)} className="font-bold">
            <XIcon className="size-5" />
            Chưa nhớ <kbd className="hidden text-xs font-normal text-white/90 sm:inline">phím 1</kbd>
          </Button>
          <Button size="lg" variant="good" onClick={() => onResult(true)} className="font-bold">
            <CheckIcon className="size-5" />
            Đã nhớ <kbd className="hidden text-xs font-normal text-white/90 sm:inline">phím 2</kbd>
          </Button>
        </div>
      )}
    </div>
  );
}
