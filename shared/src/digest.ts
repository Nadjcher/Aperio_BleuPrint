/**
 * Livraison du briefing : « recevez votre briefing là où vous travaillez ».
 * L'utilisateur choisit un ou plusieurs canaux (e-mail, Slack, Teams), une
 * fréquence et une heure d'envoi. Les webhooks sont chiffrés au repos côté
 * serveur et ne sont jamais renvoyés en clair (seuls des booléens de présence).
 */

export type DigestChannel = "email" | "slack" | "teams";
export type DigestFrequency = "daily" | "weekly" | "off";

export const DIGEST_CHANNELS: DigestChannel[] = ["email", "slack", "teams"];

export const DIGEST_CHANNEL_META: Record<DigestChannel, { label: string; hint: string }> = {
  email: { label: "E-mail", hint: "Envoyé à l'adresse de votre compte (ou une adresse dédiée)." },
  slack: { label: "Slack", hint: "Poussé dans un canal via un webhook entrant Slack." },
  teams: { label: "Microsoft Teams", hint: "Poussé dans un canal via un webhook entrant Teams." },
};

export const DIGEST_FREQUENCY_META: Record<DigestFrequency, string> = {
  daily: "Chaque jour",
  weekly: "Chaque semaine",
  off: "Désactivé",
};

/** Préférence de livraison renvoyée au client (sans secrets). */
export interface DigestPreference {
  channels: DigestChannel[];
  frequency: DigestFrequency;
  /** Heure d'envoi, 0..23 (UTC). */
  hour: number;
  /** Jour d'envoi pour la fréquence hebdomadaire : 1 = lundi … 0 = dimanche. */
  weekday: number;
  /** Adresse e-mail de destination (vide = adresse du compte). */
  email: string | null;
  hasSlackWebhook: boolean;
  hasTeamsWebhook: boolean;
  /** Date (YYYY-MM-DD) du dernier envoi programmé, ou null. */
  lastSentOn: string | null;
  updatedAt: string;
}

/** Mise à jour partielle : seuls les champs fournis sont modifiés. */
export interface UpdateDigestPreferenceDTO {
  channels?: DigestChannel[];
  frequency?: DigestFrequency;
  hour?: number;
  weekday?: number;
  email?: string | null;
  /** URL de webhook Slack (null efface, undefined conserve). */
  slackWebhook?: string | null;
  /** URL de webhook Teams (null efface, undefined conserve). */
  teamsWebhook?: string | null;
}

/** Résultat d'un envoi (test ou programmé), par canal. */
export interface DigestSendResult {
  channel: DigestChannel;
  ok: boolean;
  detail?: string;
}
