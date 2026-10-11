import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Chiffrement symétrique AES-256-GCM pour les champs sensibles au repos.
 * Format stocké : iv(12o):tag(16o):ciphertext, le tout en base64.
 */
const KEY = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
const ALGO = "aes-256-gcm";

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptField(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
