import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="text-5xl font-semibold text-muted-foreground">404</p>
      <p className="text-lg font-medium">Không tìm thấy trang này</p>
      <Button asChild>
        <Link href="/">Về tổng quan</Link>
      </Button>
    </div>
  );
}
