/** Deep link que o servidor usa para devolver o JWT ao app (ver `routes/auth.ts` do server). */
const APP_AUTH_REDIRECT = "znotes://auth";

export function appLoginUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/auth/google?client=app`;
}

export type AppAuthRedirect = { token: string } | { error: string };

/** Extrai token/erro do deep link `znotes://auth?token=...`; null se a URL não for do fluxo de login. */
export function parseAppAuthRedirect(url: string): AppAuthRedirect | null {
  if (!url.startsWith(`${APP_AUTH_REDIRECT}?`)) return null;
  const params = new URLSearchParams(url.slice(APP_AUTH_REDIRECT.length + 1));
  const token = params.get("token");
  if (token) return { token };
  return { error: params.get("error") ?? "error" };
}
