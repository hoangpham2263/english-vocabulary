
import { usePathname, useSearchParams } from "@/lib/router";
import { useEffect } from "react";
import { stopAllSound } from "@/components/sound-buttons";

/**
 * Pages change without a reload, so speech and recordings would carry on into
 * the next page. Silence everything whenever the route changes.
 */
export function StopSoundOnNavigate() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => stopAllSound, [pathname, search]);
  return null;
}
