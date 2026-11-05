
import { ArrowRightIcon, MicIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { CardBack, CardFront } from "@/components/practice/card-face";
import type { DrillProps } from "@/components/practice/practice-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRONUNCIATION_PASS, sayTarget, scorePronunciation, similarity } from "@/lib/practice";
import { useRecognitionSupported, useSpeechRecognition } from "@/lib/use-speech-recognition";
import { cn } from "@/lib/utils";

/** A sentence takes longer to say than a word. */
const SENTENCE_LISTEN_MS = 12000;

export function SpeakDrill({ card, onResult }: DrillProps) {
  const supported = useRecognitionSupported();
  const target = sayTarget(card);
  // Stop listening the moment the word has been heard; no waiting for silence.
  const isDone = useCallback((heard: string) => similarity(heard, target) >= PRONUNCIATION_PASS, [target]);
  const { state, listen, stop } = useSpeechRecognition(isDone, card.type === "sentence" || card.type === "passage" ? SENTENCE_LISTEN_MS : undefined);
  const [passedOnce, setPassedOnce] = useState(false);
  const listening = state.status === "listening";
  const result = state.status === "heard" ? scorePronunciation(state.alternatives, target) : null;
  if (result?.passed && !passedOnce) setPassedOnce(true);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border py-0">
        <CardContent className="space-y-4 px-5 py-5 sm:px-8">
          <p className="text-center text-sm font-semibold text-muted-foreground">
            Nghe mẫu rồi đọc to{" "}
            {card.type === "sound" ? <>từ <b className="text-foreground">{target}</b></> : card.type === "sentence" ? "câu này" : "từ này"}
          </p>
          <CardFront card={card} />

          {!supported ? (
            <p className="rounded-2xl bg-muted p-4 text-center text-sm">
              Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome, Edge hoặc Safari mới.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={listening ? stop : listen}
                className={cn(
                  "grid size-20 place-items-center rounded-full text-white transition-transform hover:scale-105",
                  listening
                    ? "animate-pulse border border-rate-again bg-rate-again hover:brightness-90"
                    : "border border-primary-edge bg-primary hover:bg-primary-edge",
                )}
                aria-label={listening ? "Dừng và chấm" : "Bấm rồi đọc"}
                title={listening ? "Dừng và chấm" : "Bấm rồi đọc"}
              >
                {listening ? <SquareIcon className="size-7 fill-current" /> : <MicIcon className="size-8" />}
              </button>
              <p className="min-h-5 text-sm text-muted-foreground">
                {listening
                  ? state.interim
                    ? <>Đang nghe: <b className="text-foreground">{state.interim}</b></>
                    : "Đang nghe, đọc ngay nhé. Bấm lại để dừng."
                  : "Bấm micro rồi đọc"}
              </p>
            </div>
          )}

          {state.status === "error" && <p className="text-center text-sm text-rate-again">{state.message}</p>}

          {result && (
            <div
              className={cn(
                "space-y-1 rounded-2xl border p-4 text-center",
                result.passed ? "border-rate-good/50" : "border-rate-again/50",
              )}
            >
              <p className={cn("text-lg font-bold", result.passed ? "text-rate-good" : "text-rate-again")}>
                {result.passed ? "Phát âm tốt!" : "Chưa khớp, thử lại nhé"} ({Math.round(result.score * 100)}%)
              </p>
              <p className="text-sm text-muted-foreground">
                Máy nghe được: <b className="text-foreground">{result.heard || "(không rõ)"}</b>
              </p>
            </div>
          )}

          {(result || state.status === "error") && <CardBack card={card} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={listen} disabled={!supported || listening}>
          <RotateCcwIcon />
          Đọc lại
        </Button>
        <Button size="lg" onClick={() => onResult(passedOnce)}>
          {passedOnce || !supported ? "Tiếp" : "Bỏ qua"}
          <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}
