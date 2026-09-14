import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext, RequestContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { getUserById } from "./users.js";

export const COOKIE_NAME = "z_session";
const STATE_COOKIE_NAME = "z_oauth_state";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const STATE_MAX_AGE_SECONDS = 10 * 60; // 10 minutos

declare module "fastify" {
  interface FastifyRequest {
    userId: number | null;
  }
}

/** Assinatura HMAC-SHA256 idêntica à do @fastify/cookie (p/ forjar sessão nos testes). */
export function signSessionValue(secret: string, userId: number): string {
  const value = String(userId);
  const sig = createHmac("sha256", secret).update(value).digest("base64").replace(/=/g, "");
  return `${value}.${sig}`;
}

const cookieFlags = (isProd: boolean) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
});

/** O cookie de sessão carrega o `userId` (assinado) — sem identidade fixa global. */
export function setSessionCookie(reply: FastifyReply, userId: number, isProd: boolean): void {
  reply.setCookie(COOKIE_NAME, String(userId), {
    ...cookieFlags(isProd),
    signed: true,
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getSessionUserId(request: FastifyRequest): number | null {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const id = Number(unsigned.value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Decorator de ownership: resolve o dono e rejeita sessão ausente/inválida. */
export function requireAuth(request: FastifyRequest, ctx: AppContext): number {
  const userId = getSessionUserId(request);
  if (userId === null) throw unauthorized();
  if (!getUserById(ctx, userId)) throw unauthorized("Sessão inválida");
  return userId;
}

/** Monta o ctx da requisição com o dono resolvido (usado por todas as rotas protegidas). */
export function reqCtx(ctx: AppContext, request: FastifyRequest): RequestContext {
  const userId = request.userId ?? requireAuth(request, ctx);
  return { ...ctx, userId };
}

export function newOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/** `state` anti-CSRF em cookie assinado de vida curta. */
export function setOAuthStateCookie(reply: FastifyReply, state: string, isProd: boolean): void {
  reply.setCookie(STATE_COOKIE_NAME, state, {
    ...cookieFlags(isProd),
    signed: true,
    maxAge: STATE_MAX_AGE_SECONDS,
  });
}

/** Consome o `state` (uso único): compara em tempo constante e limpa o cookie. */
export function consumeOAuthState(request: FastifyRequest, reply: FastifyReply, returnedState: string): boolean {
  const raw = request.cookies[STATE_COOKIE_NAME];
  reply.clearCookie(STATE_COOKIE_NAME, { path: "/" });
  if (!raw || !returnedState) return false;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return false;
  const a = Buffer.from(unsigned.value);
  const b = Buffer.from(returnedState);
  return a.length === b.length && timingSafeEqual(a, b);
}
