import { LogOutIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Link } from "@/lib/router";
import { logout } from "@/actions/auth";
import { AccentToggle } from "@/components/accent-provider";
import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { getToken, subscribeToken } from "@/lib/api";

export function AppHeader() {
  const signedIn = Boolean(useSyncExternalStore(subscribeToken, getToken));

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <BrandMark size={32} />
          <span className="hidden sm:inline">
            English <span className="text-primary">Lab</span>
          </span>
        </Link>
        {signedIn && (
          <>
            <NavLinks />
            <AccentToggle />
            <form action={logout}>
              <button
                type="submit"
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOutIcon className="size-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
