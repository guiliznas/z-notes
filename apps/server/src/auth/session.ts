import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";

const COOKIE_NAME = "z_session";
const COOKIE_VALUE = "authenticated";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const TOKEN_EXPIRY = "30d";

export function verifyPassword(ctx: AppContext, password: string): boolean {
  return bcrypt.compareSync(password, ctx.cfg.passwordHash);
}

export function setSessionCookie(reply: FastifyReply, isProd: boolean): void {
  reply.setCookie(COOKIE_NAME, COOKIE_VALUE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    signed: true,
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

export function isAuthenticated(request: FastifyRequest): boolean {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return false;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value === COOKIE_VALUE;
}

export function requireAuth(request: FastifyRequest): void {
  if (!isAuthenticated(request)) throw unauthorized();
}

/** Gera um token JWT para uso como Bearer token (mobile/desktop). */
export function signToken(ctx: AppContext): string {
  return jwt.sign({ sub: "user" }, ctx.cfg.jwtSecret, { expiresIn: TOKEN_EXPIRY });
}

/** Verifica se a request tem um Bearer token JWT válido. */
export function verifyToken(request: FastifyRequest, ctx: AppContext): boolean {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  try {
    jwt.verify(token, ctx.cfg.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

/** Verifica se a request está autenticada via cookie OU Bearer token. */
export function requireAnyAuth(request: FastifyRequest, ctx: AppContext): void {
  if (isAuthenticated(request)) return;
  if (verifyToken(request, ctx)) return;
  throw unauthorized();
}