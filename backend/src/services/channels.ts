import { logger } from "../utils/logger.js";

/**
 * Canaux de webhook entrant (Slack, Microsoft Teams). Tous deux reçoivent un
 * POST JSON sur une URL de webhook — seul le format du corps diffère. Les envois
 * sont best-effort : ils ne lèvent jamais, et renvoient true si la requête a
 * abouti (2xx), pour alimenter le résultat d'envoi côté digest.
 */

/** Poste un message texte simple sur un webhook entrant Slack. */
export async function postSlack(webhook: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) logger.warn({ status: res.status }, "Webhook Slack : réponse non-2xx");
    return res.ok;
  } catch (err) {
    logger.warn({ err }, "Notification Slack échouée");
    return false;
  }
}

/**
 * Carte « MessageCard » (format legacy des webhooks entrants Teams, toujours
 * supporté). Rendu riche : titre, couleur de thème, sections à puces.
 */
export interface TeamsCard {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  themeColor: string;
  summary: string;
  title: string;
  text?: string;
  sections?: Array<{
    activityTitle?: string;
    text?: string;
  }>;
  potentialAction?: Array<{
    "@type": "OpenUri";
    name: string;
    targets: Array<{ os: "default"; uri: string }>;
  }>;
}

/** Poste une carte sur un webhook entrant Microsoft Teams. */
export async function postTeams(webhook: string, card: TeamsCard): Promise<boolean> {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) logger.warn({ status: res.status }, "Webhook Teams : réponse non-2xx");
    return res.ok;
  } catch (err) {
    logger.warn({ err }, "Notification Teams échouée");
    return false;
  }
}
