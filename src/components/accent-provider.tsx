
import { createContext, useContext, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { updateAccent } from "@/actions/study";
import { api, getToken, subscribeToken } from "@/lib/api";
import { ACCENT_LABELS, ACCENTS, DEFAULT_ACCENT, setAccentLocal, type Accent } from "@/lib/accent";
import { cn } from "@/lib/utils";

const AccentContext = createContext<{ accent: Accent; change: (accent: Accent) => void }>({
  accent: DEFAULT_ACCENT,
  change: () => {},
});

/**
 * Holds the accent for every component and mirrors it into the plain store
 * `speak()` and the recogniser read. The saved choice loads after sign-in.
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const signedIn = Boolean(useSyncExternalStore(subscribeToken, getToken));
  const [accent, setAccent] = useState<Accent>(DEFAULT_ACCENT);
  // Safe to run during render: it only updates a module variable, no React state.
  setAccentLocal(accent);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    api.me().then(
      (me) => {
        if (live) setAccent(me.accent);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [signedIn]);

  const change = (next: Accent) => {
    if (next === accent) return;
    setAccent(next);
    setAccentLocal(next);
    void updateAccent(next).then((result) => {
      if (!result.ok) toast.error("Không lưu được lựa chọn giọng");
    });
  };

  return <AccentContext.Provider value={{ accent, change }}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  return useContext(AccentContext).accent;
}

export function AccentToggle() {
  const { accent, change } = useContext(AccentContext);
  const [, startTransition] = useTransition();

  return (
    <div role="radiogroup" aria-label="Giọng phát âm" className="flex rounded-lg border bg-muted p-0.5 text-xs font-bold">
      {ACCENTS.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={accent === value}
          title={`Phát âm ${ACCENT_LABELS[value].long}`}
          onClick={() => startTransition(() => change(value))}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            accent === value
              ? "bg-primary text-primary-foreground hover:bg-primary-edge"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {ACCENT_LABELS[value].short}
        </button>
      ))}
    </div>
  );
}
