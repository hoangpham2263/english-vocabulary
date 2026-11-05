
import { ExampleIpaList, IpaButton, SoundSymbol } from "@/components/ipa-button";
import { useAccent } from "@/components/accent-provider";
import { SoundButtons } from "@/components/sound-buttons";
import { SpeakButtons } from "@/components/speak-buttons";
import { Badge } from "@/components/ui/badge";
import { ipaFor } from "@/lib/accent";
import { spokenText } from "@/lib/practice";
import { asParagraph } from "@/lib/sentence";
import { cardUnitName } from "@/lib/deck-kind";
import { CARD_TYPE_LABELS, type StudyCard } from "@/lib/study";
import { cn } from "@/lib/utils";

/** The prompt side shared by every drill: word, IPA and the listen buttons. */
export function CardFront({ card, hideWord = false }: { card: StudyCard; hideWord?: boolean }) {
  const unit = cardUnitName(card);
  const speech = spokenText(card);
  const ipa = ipaFor(card, useAccent());
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="secondary">{CARD_TYPE_LABELS[card.type]}</Badge>
        {unit && <Badge variant="outline">{unit}</Badge>}
      </div>
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        {!hideWord &&
          (card.type === "sound" ? (
            <SoundSymbol front={card.front} className="text-4xl font-bold tracking-tight sm:text-5xl" />
          ) : (
            <p
              className={cn(
                "break-words",
                card.type === "passage"
                  ? "text-left text-lg leading-relaxed"
                  : card.type === "sentence"
                    ? "text-2xl font-semibold leading-snug sm:text-3xl"
                    : "text-4xl font-bold tracking-tight sm:text-5xl",
              )}
            >
              {asParagraph(card.front)}
            </p>
          ))}
        {!hideWord && ipa && <IpaButton ipa={ipa} word={card.front} className="text-lg" />}
        {card.type === "sound" ? <SoundButtons card={card} /> : speech && <SpeakButtons text={speech} className="mt-1" />}
      </div>
    </div>
  );
}

/** The answer side: meaning, example and its translation, and the note. */
export function CardBack({ card }: { card: StudyCard }) {
  return (
    <div className="space-y-3 border-t pt-4 animate-in fade-in-0">
      <p
        className={cn(
          "text-primary-edge",
          card.type === "passage" ? "text-base leading-relaxed" : "text-center text-xl font-bold",
        )}
      >
        {asParagraph(card.back)}
      </p>
      {card.example && (
        <div className="space-y-2 rounded-2xl bg-muted p-4">
          {card.type !== "sound" && <p className="text-base leading-relaxed">{card.example}</p>}
          {card.type === "sound" && card.exampleVi ? (
            <ExampleIpaList example={card.example} transcriptions={card.exampleVi} />
          ) : card.exampleVi ? (
            <p className="text-sm text-muted-foreground">{card.exampleVi}</p>
          ) : null}
          <SpeakButtons text={card.example} size="xs" label={card.type === "sound" ? "Nghe các từ" : "Nghe câu"} />
        </div>
      )}
      {card.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{card.note}</p>}
    </div>
  );
}
