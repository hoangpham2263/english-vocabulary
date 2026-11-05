
import { SnailIcon, Volume2Icon } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { ListenButton, NORMAL_RATE, SLOW_RATE, speak, useSpeechSupported } from "@/components/speak-buttons";
import { lookup, type Glossary } from "@/lib/sentence";
import { cn } from "@/lib/utils";

const GlossaryContext = createContext<Glossary>({});

/** Word meanings for the sentences of one practice session. */
export const GlossaryProvider = GlossaryContext.Provider;

export function useGlossary() {
  return useContext(GlossaryContext);
}

type Piece = { text: string; start: number };

function pieces(sentence: string): Piece[] {
  return [...sentence.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: match.index ?? 0 }));
}

/**
 * An English sentence to read: every word can be pressed for its meaning, and
 * while the sentence is read aloud the word being said lights up.
 */
export function ReadableSentence({
  text,
  className,
  controls = true,
}: {
  text: string;
  className?: string;
  /** Show the listen buttons under the sentence. */
  controls?: boolean;
}) {
  const glossary = useGlossary();
  const supported = useSpeechSupported();
  const [selected, setSelected] = useState<number | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const words = pieces(text);
  const entry = selected === null ? null : lookup(glossary, words[selected]?.text ?? "");

  function read(rate: number) {
    setReading(0);
    speak(text, rate, {
      onWord: (charIndex) => setReading(charIndex),
      onEnd: () => setReading(null),
    });
  }

  const current = reading === null ? -1 : words.findLastIndex((word) => word.start <= reading);

  return (
    <div className="space-y-3">
      <p className={cn("text-center text-2xl font-semibold leading-relaxed sm:text-3xl", className)}>
        {words.map((word, i) => (
          <span key={i}>
            <button
              type="button"
              onClick={() => {
                setSelected(i === selected ? null : i);
                speak(word.text.replace(/[^\p{L}'’-]/gu, ""));
              }}
              title="Bấm để xem nghĩa"
              className={cn(
                "rounded-md px-0.5 underline decoration-dotted decoration-muted-foreground/40 underline-offset-[6px] transition-colors hover:bg-accent",
                i === selected && "bg-secondary text-secondary-foreground decoration-transparent hover:bg-secondary",
                i === current && "bg-primary text-primary-foreground decoration-transparent hover:bg-primary-edge",
              )}
            >
              {word.text}
            </button>{" "}
          </span>
        ))}
      </p>

      {selected !== null && (
        <div className="mx-auto max-w-md rounded-lg border bg-card px-4 py-2 text-center text-sm animate-in fade-in-0">
          {entry ? (
            <>
              <b>{entry.form}</b>: {entry.meaning}
            </>
          ) : (
            <span className="text-muted-foreground">
              Chưa có &quot;{words[selected]?.text.replace(/[^\p{L}'’-]/gu, "")}&quot; trong 6 sách từ vựng. Xem nghĩa cả câu bên dưới.
            </span>
          )}
        </div>
      )}

      {controls && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ListenButton icon={Volume2Icon} disabled={!supported} onClick={() => read(NORMAL_RATE)} title="Nghe cả câu">
            Nghe
          </ListenButton>
          <ListenButton icon={SnailIcon} disabled={!supported} onClick={() => read(SLOW_RATE)} title="Nghe chậm từng từ">
            Chậm
          </ListenButton>
        </div>
      )}
    </div>
  );
}
