
import { HomeIcon } from "lucide-react";
import { Link } from "@/lib/router";
import { usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";

// Studying happens inside each book, so the header only leads home.
const LINKS = [{ href: "/", label: "Khoá học", icon: HomeIcon, exact: true }];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="ml-auto flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.endsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3",
              active && "border-primary/40 bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
