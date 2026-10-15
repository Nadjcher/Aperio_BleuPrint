import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AccessTokenPayload } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { OneTimeToken, type TokenPurpose } from "../entities/OneTimeToken.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/index.js";

const refreshTokens = () => AppDataSource.getRepository(RefreshToken);
const oneTimeTokens = () => AppDataSource.getRepository(OneTimeToken);

/** Hash SHA-256 (hex). Utilisé pour ne stocker que des empreintes de jetons. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Signe un JWT d'accès (issuer/audience/TTL depuis la config). */
export function signAccess(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as jwt.SignOptions);
}

/** Vérifie un JWT d'accès ; lève AppError 401 si invalide/expiré. */
export function verifyAccess(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as AccessTokenPayload;
  } catch {
    throw new AppError(401, "unauthorized", "Jeton d'accès invalide ou expiré");
  }
}

/** Émet un refresh token opaque, stocke son hash, renvoie le jeton en clair. */
export async function issueRefresh(userId: string, ttlDays = 7): Promise<string> {
  const raw = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);
  await refreshTokens().save(
    refreshTokens().create({ userId, tokenHash: sha256(raw), expiresAt }),
  );
  return raw;
}

/** Émet un jeton à usage unique, stocke son hash, renvoie le jeton en clair. */
export async function issueOneTimeToken(
  userId: string,
  purpose: TokenPurpose,
  ttlMs: number,
): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await oneTimeTokens().save(
    oneTimeTokens().create({
      userId,
      purpose,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + ttlMs),
      usedAt: null,
    }),
  );
  return raw;
}

/** Valide et consomme un jeton à usage unique. */
export async function consumeOneTimeToken(
  rawToken: string,
  purpose: TokenPurpose,
): Promise<OneTimeToken> {
  const stored = await oneTimeTokens().findOne({
    where: { tokenHash: sha256(rawToken), purpose },
  });
  if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "invalid_token", "Lien invalide ou expiré");
  }
  stored.usedAt = new Date();
  await oneTimeTokens().save(stored);
  return stored;
}
