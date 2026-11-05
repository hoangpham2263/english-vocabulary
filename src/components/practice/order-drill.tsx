
import { ArrowRightIcon, EyeIcon, LightbulbIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import type { DrillProps } from "@/components/practice/practice-session";
import { ReadableSentence } from "@/components/practice/readable-sentence";
import { speak } from "@/components/speak-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { chunks, seededOrder, tileLabel, wordKey } from "@/lib/sentence";
import { cn } from "@/lib/utils";

/**
 * Word order: the Vietnamese sentence, and the English words shuffled as
 * tiles to put in order. A wrong order marks each misplaced tile for the
 * learner to take out and fix; "Gợi ý" places the next right word.
 */
export function OrderDrill({ card, onResult }: DrillProps) {
  const words = chunks(card.front);
  const [pool] = useState(() => seededOrder(words.length, card.id));
  // Tile indexes (into words) in the order the learner placed them.
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const done = solved || revealed;

  const rightAt = (position: number, tile: number) => wordKey(words[tile]) === wordKey(words[position] ?? "");
  const correctPrefix = () => {
    let n = 0;
    while (n < placed.length && rightAt(n, placed[n])) n += 1;
    return n;
  };

  function place(tile: number) {
    if (done) return;
    setChecked(false);
    setPlaced((list) => [...list, tile]);
  }

  function remove(position: number) {
    if (done) return;
    setChecked(false);
    setPlaced((list) => list.filter((_, i) => i !== position));
  }

  function check() {
    if (placed.length < words.length) return;
    if (placed.every((tile, i) => rightAt(i, tile))) {
      setSolved(true);
      speak(card.front);
    } else {
      setChecked(true);
      setMissed(true);
    }
  }

  function hint() {
    setMissed(true);
    setChecked(false);
    const keep = placed.slice(0, correctPrefix());
    const next = words.findIndex((word, tile) => !keep.includes(tile) && wordKey(word) === wordKey(words[keep.length]));
    setPlaced(next >= 0 ? [...keep, next] : keep);
  }

  function reveal() {
    setMissed(true);
    setRevealed(true);
    speak(card.front);
  }

  const free = pool.filter((tile) => !placed.includes(tile));

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="space-y-5 px-5 py-6 sm:px-8">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Xếp các từ thành câu tiếng Anh có nghĩa là</p>
            <p className="text-xl font-bold text-primary-edge sm:text-2xl">{card.back}</p>
          </div>

          {done ? (
            <div className={cn("space-y-3 rounded-2xl border p-4", solved ? "border-rate-good/40" : "border-rate-again/40")}>
              <p className={cn("text-center text-sm font-bold", solved ? "text-rate-good" : "text-muted-foreground")}>
                {solved ? (missed ? "Đúng rồi, nhớ nhé!" : "Chính xác!") : "Câu đúng"}
              </p>
              <ReadableSentence text={card.front} />
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "flex min-h-14 flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-dashed p-3",
                  checked && "border-rate-again/60",
                )}
              >
                {placed.length === 0 && <span className="text-sm text-muted-foreground">Bấm các từ bên dưới theo thứ tự</span>}
                {placed.map((tile, position) => (
                  <Tile
                    key={`${tile}-${position}`}
                    onClick={() => remove(position)}
                    state={checked ? (rightAt(position, tile) ? "right" : "wrong") : "placed"}
                    title="Bấm để bỏ ra"
                  >
                    {tileLabel(words[tile], tile)}
                  </Tile>
                ))}
              </div>
              {checked && (
                <p className="text-center text-xs text-muted-foreground">
                  Từ viền đỏ đang sai chỗ. Bấm vào để bỏ ra rồi xếp lại.
                </p>
              )}
              <div className="flex min-h-12 flex-wrap justify-center gap-1.5">
                {free.map((tile) => (
                  <Tile key={tile} onClick={() => place(tile)} state="free">
                    {tileLabel(words[tile], tile)}
                  </Tile>
                ))}
              </div>
            </>
          )}

          {!done ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={hint} title="Đặt giúp từ đúng tiếp theo">
                <LightbulbIcon />
                Gợi ý
              </Button>
              <Button variant="outline" onClick={reveal}>
                <EyeIcon />
                Xem đáp án
              </Button>
              <Button variant="outline" onClick={() => setPlaced([])} disabled={placed.length === 0} title="Bỏ hết ra xếp lại">
                <RotateCcwIcon />
              </Button>
              <Button className="ml-auto" onClick={check} disabled={placed.length < words.length}>
                Kiểm tra
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={() => onResult(!missed)} autoFocus>
                Tiếp <ArrowRightIcon />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({
  children,
  state,
  ...props
}: React.ComponentProps<"button"> & { state: "free" | "placed" | "right" | "wrong" }) {
  return (
    <button
      type="button"
      className={cn(
        "h-10 rounded-lg border bg-card px-3 text-base font-semibold transition-colors hover:bg-accent",
        state === "placed" && "border-primary/50",
        state === "right" && "border-rate-good text-rate-good",
        state === "wrong" && "border-rate-again bg-rate-again/10 text-rate-again",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
