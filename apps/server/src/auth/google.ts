import { badGateway } from "../errors.js";
import type { GoogleOAuthConfig } from "../config.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleConfigured(cfg: { google: GoogleOAuthConfig }): boolean {
  return Boolean(cfg.google.clientId && cfg.google.clientSecret && cfg.google.callbackUrl);
}

export function buildGoogleAuthUrl(google: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
}

/** Troca o `code` por tokens (100% server-side; nenhum token chega ao frontend). */
export async function exchangeCodeForTokens(google: GoogleOAuthConfig, code: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: google.callbackUrl,
        grant_type: "authorization_code",
      }).toString(),
    });
  } catch {
    throw badGateway("Falha ao contatar o Google para concluir o login");
  }
  if (!res.ok) throw badGateway("Google rejeitou a conclusão do login");
  const body = (await res.json()) as TokenResponse;
  if (!body.access_token) throw badGateway("Google não retornou credencial de acesso");
  return body.access_token;
}

/** Busca o perfil (sub estável + e-mail) com o access token. */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw badGateway("Falha ao obter o perfil no Google");
  }
  if (!res.ok) throw badGateway("Google rejeitou a leitura do perfil");
  const body = (await res.json()) as Partial<GoogleProfile>;
  if (!body.sub || !body.email) throw badGateway("Perfil do Google sem identificador ou e-mail");
  return { sub: body.sub, email: body.email, name: body.name, picture: body.picture };
}
