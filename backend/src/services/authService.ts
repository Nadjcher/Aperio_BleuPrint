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
import { OneTimeToken, type TokenPurpose } from "../entities/OneTimeToken.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middleware/errorHandler.js";
import { appBaseUrl, sendEmail } from "../email/index.js";
import { passwordResetEmail, verificationEmail } from "../email/templates.js";

const users = () => AppDataSource.getRepository(User);
const refreshTokens = () => AppDataSource.getRepository(RefreshToken);
const oneTimeTokens = () => AppDataSource.getRepository(OneTimeToken);

const BCRYPT_ROUNDS = 12;

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    emailVerified: u.emailVerified,
    isGuest: u.isGuest,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Émet un jeton à usage unique, stocke son hash, renvoie le jeton en clair. */
async function issueOneTimeToken(
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
async function consumeOneTimeToken(
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

/** Envoie (ou journalise) l'e-mail de vérification d'adresse. */
async function sendVerificationEmail(user: User): Promise<void> {
  const raw = await issueOneTimeToken(user.id, "email_verify", 24 * 3600 * 1000);
  const link = `${appBaseUrl()}/verify-email?token=${raw}`;
  await sendEmail(verificationEmail(user.email, user.name, link));
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signAccess(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as jwt.SignOptions);
}

async function issueRefresh(userId: string, ttlDays = 7): Promise<string> {
  const raw = crypto.randomBytes(40).toString("hex");
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
    isGuest: user.isGuest,
  };
  return {
    accessToken: signAccess(payload),
    // Session plus courte pour les invités (compte éphémère).
    refreshToken: await issueRefresh(user.id, user.isGuest ? 1 : 7),
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
  // Le premier utilisateur RÉEL (hors invités) devient admin (et auto-vérifié).
  const count = await users().count({ where: { isGuest: false } });
  const role: Role = count === 0 ? "admin" : "viewer";
  const emailVerified = count === 0;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await users().save(
    users().create({ email: normalized, name, passwordHash, role, emailVerified }),
  );
  // E-mail de confirmation (sauf 1er admin déjà vérifié). N'échoue jamais.
  if (!emailVerified) await sendVerificationEmail(user);
  return { user: toPublic(user), tokens: await tokensFor(user) };
}

/**
 * Crée un compte INVITÉ (essai sans inscription). Rôle manager pour pouvoir
 * créer/synchroniser un projet, mais marqué isGuest : limité à 1 projet et
 * convertible en compte réel via upgradeGuest.
 */
export async function createGuest(): Promise<{
  user: UserPublic;
  tokens: AuthTokens;
}> {
  const id = crypto.randomUUID();
  const email = `guest-${id}@guest.aperio.local`;
  // Mot de passe aléatoire non utilisable (le guest n'a pas de login par MDP).
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), BCRYPT_ROUNDS);
  const user = await users().save(
    users().create({
      email,
      name: "Invité",
      passwordHash,
      role: "manager",
      isGuest: true,
      emailVerified: false,
      notifyByEmail: false,
    }),
  );
  return { user: toPublic(user), tokens: await tokensFor(user) };
}

/**
 * Convertit un compte invité en compte réel : fixe email/nom/mot de passe,
 * lève le flag invité. Les projets de l'invité sont conservés (même userId).
 */
export async function upgradeGuest(
  userId: string,
  email: string,
  password: string,
  name: string,
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user || !user.isGuest) {
    throw new AppError(400, "not_guest", "Ce compte n'est pas un compte invité");
  }
  const normalized = email.trim().toLowerCase();
  const existing = await users().findOne({ where: { email: normalized } });
  if (existing) {
    throw new AppError(409, "email_taken", "Cet email est déjà utilisé");
  }
  // Si aucun compte réel n'existe encore, ce 1er converti devient admin.
  const realUsers = await users().count({ where: { isGuest: false } });
  user.email = normalized;
  user.name = name;
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.isGuest = false;
  user.notifyByEmail = true;
  if (realUsers === 0) {
    user.role = "admin";
    user.emailVerified = true;
  }
  const saved = await users().save(user);
  if (!saved.emailVerified) await sendVerificationEmail(saved);
  // Réémettre des tokens : le JWT ne porte plus isGuest.
  return { user: toPublic(saved), tokens: await tokensFor(saved) };
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
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    throw new AppError(403, "email_not_verified", "Veuillez confirmer votre e-mail");
  }
  return { user: toPublic(user), tokens: await tokensFor(user) };
}

export async function refresh(rawToken: string): Promise<AuthTokens> {
  const tokenHash = sha256(rawToken);
  const stored = await refreshTokens().findOne({ where: { tokenHash } });

  if (!stored) {
    throw new AppError(401, "invalid_refresh", "Refresh token invalide");
  }

  // Détection de réutilisation : un token déjà rotaté (révoqué) qui ressurgit
  // signale un vol probable → on révoque TOUTE la famille de l'utilisateur.
  if (stored.revoked) {
    await revokeAllForUser(stored.userId);
    logger.warn({ userId: stored.userId }, "Réutilisation de refresh token détectée — famille révoquée");
    throw new AppError(401, "refresh_reuse", "Refresh token déjà utilisé");
  }

  if (stored.expiresAt.getTime() < Date.now()) {
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

/**
 * Demande de réinitialisation. Ne révèle jamais si l'e-mail existe (anti
 * énumération) : renvoie toujours sans erreur. Si l'utilisateur existe, envoie
 * un lien de réinitialisation (valable 1 h).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await users().findOne({ where: { email: normalized } });
  if (!user) return;
  const raw = await issueOneTimeToken(user.id, "password_reset", 3600 * 1000);
  const link = `${appBaseUrl()}/reset-password?token=${raw}`;
  await sendEmail(passwordResetEmail(user.email, user.name, link));
}

/** Réinitialise le mot de passe via un jeton valide, puis révoque les sessions. */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const token = await consumeOneTimeToken(rawToken, "password_reset");
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await users().update({ id: token.userId }, { passwordHash });
  // Sécurité : invalider toutes les sessions existantes après un reset.
  await revokeAllForUser(token.userId);
  logger.info({ userId: token.userId }, "Mot de passe réinitialisé");
}

/** Confirme l'adresse e-mail via un jeton valide. */
export async function verifyEmail(rawToken: string): Promise<void> {
  const token = await consumeOneTimeToken(rawToken, "email_verify");
  await users().update({ id: token.userId }, { emailVerified: true });
  logger.info({ userId: token.userId }, "E-mail vérifié");
}

/** Renvoie un e-mail de vérification à l'utilisateur courant (si non vérifié). */
export async function resendVerification(userId: string): Promise<void> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user || user.emailVerified) return;
  await sendVerificationEmail(user);
}

/** Droit de rectification RGPD : met à jour le profil (nom). */
export async function updateProfile(
  userId: string,
  changes: { name?: string; notifyByEmail?: boolean },
): Promise<UserPublic> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user) throw new AppError(404, "not_found", "Utilisateur introuvable");
  if (changes.name !== undefined) user.name = changes.name;
  if (changes.notifyByEmail !== undefined) user.notifyByEmail = changes.notifyByEmail;
  const saved = await users().save(user);
  return toPublic(saved);
}
