import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Couche e-mail multi-provider, à dégradation gracieuse (comme la couche LLM).
 *   - "none"   : journalise l'e-mail au lieu de l'envoyer (défaut). Le site
 *                fonctionne normalement, utile en dev et sans fournisseur.
 *   - "resend" : envoi réel via l'API Resend (https://resend.com), sans SDK
 *                (simple fetch) pour ne pas ajouter de dépendance.
 */
export type EmailProvider = "none" | "resend";

export function resolveEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY) return "resend";
  return "none";
}

/** Base publique pour les liens contenus dans les e-mails. */
export function appBaseUrl(): string {
  return (env.APP_BASE_URL || env.CORS_ORIGIN || "").replace(/\/$/, "");
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Envoie un e-mail. Ne lève jamais : un échec d'envoi est journalisé mais ne
 * casse pas la requête métier (ex. l'inscription aboutit même si le mail échoue).
 * Retourne true si l'e-mail est parti (ou aurait été envoyé en mode réel).
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const provider = resolveEmailProvider();
  if (provider === "none") {
    logger.info(
      { to: msg.to, subject: msg.subject, mode: "log-only" },
      "E-mail (non envoyé : EMAIL_PROVIDER=none) — contenu journalisé",
    );
    logger.debug({ to: msg.to, text: msg.text }, "Corps de l'e-mail");
    return false;
  }
  try {
    await sendViaResend(msg);
    logger.info({ to: msg.to, subject: msg.subject, provider }, "E-mail envoyé");
    return true;
  } catch (err) {
    logger.warn({ err, to: msg.to, subject: msg.subject }, "Échec d'envoi de l'e-mail");
    return false;
  }
}
