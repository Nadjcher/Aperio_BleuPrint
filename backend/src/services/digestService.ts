import type {
  Briefing,
  BriefingPriority,
  DigestChannel,
  DigestFrequency,
  DigestPreference,
  DigestSendResult,
  UpdateDigestPreferenceDTO,
} from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { UserDigestPreference } from "../entities/UserDigestPreference.js";
import { User } from "../entities/User.js";
import { encryptField, decryptField } from "../utils/crypto.js";
import { appBaseUrl, sendEmail } from "../email/index.js";
import { briefingDigestEmail } from "../email/templates.js";
import { buildBriefing } from "./briefingService.js";
import { postSlack, postTeams, type TeamsCard } from "./channels.js";
import { logger } from "../utils/logger.js";

const repo = () => AppDataSource.getRepository(UserDigestPreference);

// ── Préférence : DTO, défauts, lecture/écriture ────────────────────────────────

function toDTO(p: UserDigestPreference): DigestPreference {
  return {
    channels: p.channels ?? [],
    frequency: p.frequency,
    hour: p.hour,
    weekday: p.weekday,
    email: p.email,
    hasSlackWebhook: Boolean(p.slackWebhookEnc),
    hasTeamsWebhook: Boolean(p.teamsWebhookEnc),
    lastSentOn: p.lastSentOn,
    updatedAt: p.updatedAt.toISOString(),
  };
}

const DEFAULTS = (): DigestPreference => ({
  channels: [],
  frequency: "off",
  hour: 8,
  weekday: 1,
  email: null,
  hasSlackWebhook: false,
  hasTeamsWebhook: false,
  lastSentOn: null,
  updatedAt: new Date(0).toISOString(),
});

export async function getPreference(userId: string): Promise<DigestPreference> {
  const p = await repo().findOne({ where: { userId } });
  return p ? toDTO(p) : DEFAULTS();
}

function sanitizeHour(h: number): number {
  return Math.max(0, Math.min(23, Math.trunc(h)));
}
function sanitizeWeekday(d: number): number {
  return Math.max(0, Math.min(6, Math.trunc(d)));
}

export async function upsertPreference(
  userId: string,
  data: UpdateDigestPreferenceDTO,
): Promise<DigestPreference> {
  const existing = await repo().findOne({ where: { userId } });
  const row = existing ?? repo().create({ userId, channels: [] });

  if (data.channels !== undefined) {
    // Déduplique et borne aux canaux connus.
    const allowed: DigestChannel[] = ["email", "slack", "teams"];
    row.channels = allowed.filter((c) => data.channels!.includes(c));
  }
  if (data.frequency !== undefined) row.frequency = data.frequency;
  if (data.hour !== undefined) row.hour = sanitizeHour(data.hour);
  if (data.weekday !== undefined) row.weekday = sanitizeWeekday(data.weekday);
  if (data.email !== undefined) row.email = data.email?.trim() || null;
  if (data.slackWebhook !== undefined) {
    row.slackWebhookEnc = data.slackWebhook ? encryptField(data.slackWebhook) : null;
  }
  if (data.teamsWebhook !== undefined) {
    row.teamsWebhookEnc = data.teamsWebhook ? encryptField(data.teamsWebhook) : null;
  }
  return toDTO(await repo().save(row));
}

interface ResolvedPref {
  channels: DigestChannel[];
  frequency: DigestFrequency;
  hour: number;
  weekday: number;
  email: string | null;
  slackWebhook?: string;
  teamsWebhook?: string;
}

function resolveRow(p: UserDigestPreference): ResolvedPref {
  const decrypt = (enc: string | null): string | undefined => {
    if (!enc) return undefined;
    try {
      return decryptField(enc);
    } catch {
      return undefined;
    }
  };
  return {
    channels: p.channels ?? [],
    frequency: p.frequency,
    hour: p.hour,
    weekday: p.weekday,
    email: p.email,
    slackWebhook: decrypt(p.slackWebhookEnc),
    teamsWebhook: decrypt(p.teamsWebhookEnc),
  };
}

// ── Rendu PUR du briefing par canal (testable, sans accès base) ────────────────

const PRIORITY_EMOJI: Record<BriefingPriority, string> = {
  critical: "🔴",
  important: "🟠",
  fyi: "🔵",
  win: "🟢",
};

/** Rendu Slack (texte mrkdwn), avec liens absolus vers l'app. */
export function renderSlackText(briefing: Briefing, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const header =
    `*Votre briefing Aperio*\n${briefing.greeting}\n` +
    `Santé : *${briefing.health.score}/100* (risque ${briefing.health.risk})`;
  if (briefing.items.length === 0) {
    return `${header}\n\nRien ne requiert votre attention aujourd'hui. ${base}/dashboard`;
  }
  const lines = briefing.items
    .slice(0, 10)
    .map((it) => {
      const action = it.actions[0];
      const link = action ? `${base}${action.to}` : `${base}/dashboard`;
      return `${PRIORITY_EMOJI[it.priority]} <${link}|${it.title}> — ${it.detail}`;
    })
    .join("\n");
  return `${header}\n\n${lines}`;
}

/** Rendu Teams (MessageCard), couleur selon la priorité la plus élevée. */
export function renderTeamsCard(briefing: Briefing, baseUrl: string): TeamsCard {
  const base = baseUrl.replace(/\/$/, "");
  const themeColor =
    briefing.counts.critical > 0 ? "D7263D" : briefing.counts.important > 0 ? "F59E0B" : "22C55E";
  const sections = briefing.items.slice(0, 10).map((it) => ({
    activityTitle: `${PRIORITY_EMOJI[it.priority]} ${it.title}`,
    text: it.detail,
  }));
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor,
    summary: "Votre briefing Aperio",
    title: "Votre briefing Aperio",
    text: `${briefing.greeting}  \nSanté : **${briefing.health.score}/100** (risque ${briefing.health.risk})`,
    sections: sections.length ? sections : [{ text: "Rien ne requiert votre attention aujourd'hui." }],
    potentialAction: [
      {
        "@type": "OpenUri",
        name: "Ouvrir le tableau de bord",
        targets: [{ os: "default", uri: `${base}/dashboard` }],
      },
    ],
  };
}

// ── Décision d'envoi (PURE) ────────────────────────────────────────────────────

/** Date UTC (YYYY-MM-DD). */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Un digest est « dû » si : au moins un canal actif, fréquence non désactivée,
 * l'heure d'envoi est atteinte, pas déjà envoyé aujourd'hui, et (hebdo) le bon
 * jour. Fonction PURE → testable et déterministe.
 */
export function isDigestDue(
  pref: Pick<ResolvedPref, "channels" | "frequency" | "hour" | "weekday"> & { lastSentOn: string | null },
  now: Date,
): boolean {
  if (pref.frequency === "off") return false;
  if (pref.channels.length === 0) return false;
  if (now.getUTCHours() < pref.hour) return false;
  if (pref.lastSentOn === isoDay(now)) return false;
  if (pref.frequency === "weekly" && now.getUTCDay() !== pref.weekday) return false;
  return true;
}

// ── Envoi ──────────────────────────────────────────────────────────────────────

/** Envoie le briefing d'un utilisateur sur tous ses canaux actifs. */
export async function sendDigestNow(userId: string): Promise<DigestSendResult[]> {
  const row = await repo().findOne({ where: { userId } });
  const pref = row ? resolveRow(row) : null;
  if (!pref || pref.channels.length === 0) return [];

  const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
  if (!user) return [];

  const briefing = await buildBriefing(userId);
  const base = appBaseUrl();
  const results: DigestSendResult[] = [];

  for (const channel of pref.channels) {
    if (channel === "email") {
      const to = pref.email || user.email;
      const ok = await sendEmail(briefingDigestEmail(to, user.name, briefing, base));
      results.push({ channel, ok, detail: ok ? `Envoyé à ${to}` : "Non envoyé (fournisseur e-mail non configuré ou échec)" });
    } else if (channel === "slack") {
      if (!pref.slackWebhook) {
        results.push({ channel, ok: false, detail: "Aucun webhook Slack enregistré" });
        continue;
      }
      const ok = await postSlack(pref.slackWebhook, renderSlackText(briefing, base));
      results.push({ channel, ok, detail: ok ? "Envoyé" : "Échec de l'envoi Slack" });
    } else if (channel === "teams") {
      if (!pref.teamsWebhook) {
        results.push({ channel, ok: false, detail: "Aucun webhook Teams enregistré" });
        continue;
      }
      const ok = await postTeams(pref.teamsWebhook, renderTeamsCard(briefing, base));
      results.push({ channel, ok, detail: ok ? "Envoyé" : "Échec de l'envoi Teams" });
    }
  }
  return results;
}

/**
 * Parcourt les préférences actives et envoie le briefing à ceux qui sont « dus »
 * (heure atteinte, pas déjà envoyé aujourd'hui). Appelé périodiquement par le
 * planificateur du worker, et exposé via un endpoint pour un cron externe de
 * secours. Retourne le nombre d'utilisateurs servis.
 */
export async function runDueDigests(now = new Date()): Promise<number> {
  const candidates = await repo()
    .createQueryBuilder("p")
    .where("p.frequency <> :off", { off: "off" })
    .getMany();

  let sent = 0;
  for (const row of candidates) {
    if (!isDigestDue({ ...row, channels: row.channels ?? [] }, now)) continue;
    try {
      const results = await sendDigestNow(row.userId);
      if (results.some((r) => r.ok)) sent += 1;
      // Marque la journée même si tout a échoué : évite de marteler un webhook
      // mort à chaque tick. L'utilisateur verra l'échec via « Envoyer maintenant ».
      row.lastSentOn = isoDay(now);
      await repo().save(row);
    } catch (err) {
      logger.warn({ err, userId: row.userId }, "Envoi du digest programmé en échec");
    }
  }
  if (sent) logger.info({ sent }, "Digests programmés envoyés");
  return sent;
}
