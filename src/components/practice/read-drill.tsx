
import { CheckIcon, EyeIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DrillProps } from "@/components/practice/practice-session";
import { ReadableSentence } from "@/components/practice/readable-sentence";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Reading: the English sentence alone, words pressable for their meaning and
 * read aloud word by word. The translation stays hidden until asked for, then
 * the learner says whether they understood it.
 */
export function ReadDrill({ card, onResult }: DrillProps) {
  const [shown, setShown] = useState(false);
  const passage = card.type === "passage";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!shown && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setShown(true);
      } else if (shown && event.key === "1") onResult(false);
      else if (shown && (event.key === "2" || event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        onResult(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, onResult]);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="space-y-5 px-5 py-6 sm:px-8">
          <p className="text-center text-sm font-semibold text-muted-foreground">
            Đọc và hiểu {passage ? "đoạn" : "câu"} này. Bấm vào từ nào chưa biết để xem nghĩa.
          </p>
          <ReadableSentence
            text={card.front}
            className={passage ? "text-left text-lg leading-loose font-normal sm:text-xl" : undefined}
          />
          {shown ? (
            <div className="space-y-1 border-t pt-4 text-center animate-in fade-in-0">
              <p className="text-sm text-muted-foreground">Nghĩa của {passage ? "đoạn" : "câu"}</p>
              <p className={cn("text-primary-edge", passage ? "text-left text-base leading-relaxed" : "text-xl font-bold")}>
                {card.back}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShown(true)}>
                <EyeIcon />
                Xem nghĩa {passage ? "đoạn" : "câu"} <kbd className="text-xs font-normal text-muted-foreground">Space</kbd>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {shown && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="again" onClick={() => onResult(false)} className="font-bold">
            <XIcon className="size-5" />
            Chưa hiểu <kbd className="hidden text-xs font-normal text-white/90 sm:inline">phím 1</kbd>
          </Button>
          <Button size="lg" variant="good" onClick={() => onResult(true)} className="font-bold">
            <CheckIcon className="size-5" />
            Hiểu rồi <kbd className="hidden text-xs font-normal text-white/90 sm:inline">phím 2</kbd>
          </Button>
        </div>
      )}
    </div>
  );
}
