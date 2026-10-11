import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  AccessTokenPayload,
  AuthTokens,
  Role,
  UserPublic,
} from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../entities/User.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";

const users = () => AppDataSource.getRepository(User);
const refreshTokens = () => AppDataSource.getRepository(RefreshToken);

const BCRYPT_ROUNDS = 12;

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signAccess(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

async function issueRefresh(userId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString("hex");
  const ttlDays = 7;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);
  await refreshTokens().save(
    refreshTokens().create({ userId, tokenHash: sha256(raw), expiresAt }),
  );
  return raw;
}

async function tokensFor(user: User): Promise<AuthTokens> {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: signAccess(payload),
    refreshToken: await issueRefresh(user.id),
  };
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const normalized = email.trim().toLowerCase();
  const existing = await users().findOne({ where: { email: normalized } });
  if (existing) {
    throw new AppError(409, "email_taken", "Cet email est déjà utilisé");
  }
  // Le premier utilisateur inscrit devient admin.
  const count = await users().count();
  const role: Role = count === 0 ? "admin" : "viewer";
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await users().save(
    users().create({ email: normalized, name, passwordHash, role }),
  );
  return { user: toPublic(user), tokens: await tokensFor(user) };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const normalized = email.trim().toLowerCase();
  const user = await users().findOne({ where: { email: normalized } });
  // Comparaison même si l'utilisateur n'existe pas, pour limiter l'oracle de timing.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    throw new AppError(401, "invalid_credentials", "Identifiants invalides");
  }
  return { user: toPublic(user), tokens: await tokensFor(user) };
}

export async function refresh(rawToken: string): Promise<AuthTokens> {
  const tokenHash = sha256(rawToken);
  const stored = await refreshTokens().findOne({ where: { tokenHash } });
  if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "invalid_refresh", "Refresh token invalide");
  }
  // Rotation : on révoque l'ancien et on en émet un nouveau.
  stored.revoked = true;
  await refreshTokens().save(stored);
  const user = await users().findOne({ where: { id: stored.userId } });
  if (!user) throw new AppError(401, "invalid_refresh", "Utilisateur introuvable");
  return tokensFor(user);
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await refreshTokens().update({ userId, revoked: false }, { revoked: true });
}

export async function getUser(userId: string): Promise<UserPublic> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user) throw new AppError(404, "not_found", "Utilisateur introuvable");
  return toPublic(user);
}
