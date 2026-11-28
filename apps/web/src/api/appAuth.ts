import { parseDeepLink } from "@/lib/deepLink";

export function appLoginUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/auth/google?client=app`;
}

export type AppAuthRedirect = { token: string } | { error: string };

/** Extrai token/erro do deep link `znotes://auth?token=...`; null se a URL não for do fluxo de login. */
export function parseAppAuthRedirect(url: string): AppAuthRedirect | null {
  const parsed = parseDeepLink(url);
  if (parsed?.type === "auth") {
    if (parsed.token) return { token: parsed.token };
    return { error: parsed.error ?? "error" };
  }
  return null;
}
