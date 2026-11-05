import { useSyncExternalStore } from "react";
import { Navigate, useSearchParams } from "react-router";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { getToken, subscribeToken } from "@/lib/api";

/** Only a path inside this app, never another origin. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}

export function LoginPage() {
  const token = useSyncExternalStore(subscribeToken, getToken);
  const [params] = useSearchParams();
  if (token) return <Navigate to={safeNext(params.get("next"))} replace />;

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-2 text-center">
        <BrandMark size={56} className="mx-auto" />
        <h1 className="text-2xl font-bold">English Lab</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập để tiếp tục học</p>
      </div>
      <LoginForm />
    </div>
  );
}
