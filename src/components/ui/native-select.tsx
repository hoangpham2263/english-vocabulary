import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type NativeSelectProps = React.ComponentProps<"select"> & {
  containerClassName?: string;
  iconClassName?: string;
};

// The browser's own select, styled like the Hoàn Hời site.
function NativeSelect({ className, containerClassName, iconClassName, children, ...props }: NativeSelectProps) {
  return (
    <span className={cn("relative inline-flex w-full", containerClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-field py-0 pl-3 pr-10 text-sm text-foreground outline-none",
          "transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className={cn("pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground", iconClassName)}
      />
    </span>
  );
}

export { NativeSelect };
