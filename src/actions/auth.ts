import { api, ApiError, setToken } from "@/lib/api";

export type LoginState = { error?: string; username?: string } | null;

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  try {
    const { token } = await api.login(username, password);
    // The login page sees the token and moves on.
    setToken(token);
    return null;
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Không đăng nhập được.", username };
  }
}

export function logout() {
  setToken(null);
}
