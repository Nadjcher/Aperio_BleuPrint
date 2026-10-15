import type { NotificationSettings } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { NotificationSetting } from "../entities/NotificationSetting.js";
import { encryptField, decryptField } from "../utils/crypto.js";

const repo = () => AppDataSource.getRepository(NotificationSetting);

function toDTO(s: NotificationSetting): NotificationSettings {
  return {
    projectId: s.projectId,
    hasSlackWebhook: Boolean(s.slackWebhookEnc),
    onAnomaly: s.onAnomaly,
    onPendingDecision: s.onPendingDecision,
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Réglages par défaut quand aucun n'est enregistré. */
const DEFAULTS = (projectId: string): NotificationSettings => ({
  projectId,
  hasSlackWebhook: false,
  onAnomaly: true,
  onPendingDecision: true,
  updatedAt: new Date(0).toISOString(),
});

export async function getSettings(projectId: string): Promise<NotificationSettings> {
  const s = await repo().findOne({ where: { projectId } });
  return s ? toDTO(s) : DEFAULTS(projectId);
}

export async function upsertSettings(
  projectId: string,
  data: { slackWebhook?: string | null; onAnomaly?: boolean; onPendingDecision?: boolean },
): Promise<NotificationSettings> {
  const existing = await repo().findOne({ where: { projectId } });
  const row = existing ?? repo().create({ projectId });
  if (data.slackWebhook !== undefined) {
    row.slackWebhookEnc = data.slackWebhook ? encryptField(data.slackWebhook) : null;
  }
  if (data.onAnomaly !== undefined) row.onAnomaly = data.onAnomaly;
  if (data.onPendingDecision !== undefined) row.onPendingDecision = data.onPendingDecision;
  return toDTO(await repo().save(row));
}

/** Réglages internes (avec webhook déchiffré) pour l'envoi. */
export interface ResolvedNotif {
  slackWebhook?: string;
  onAnomaly: boolean;
  onPendingDecision: boolean;
}

export async function resolveSettings(projectId: string): Promise<ResolvedNotif> {
  const s = await repo().findOne({ where: { projectId } });
  if (!s) return { onAnomaly: true, onPendingDecision: true };
  let slackWebhook: string | undefined;
  if (s.slackWebhookEnc) {
    try {
      slackWebhook = decryptField(s.slackWebhookEnc);
    } catch {
      slackWebhook = undefined;
    }
  }
  return { slackWebhook, onAnomaly: s.onAnomaly, onPendingDecision: s.onPendingDecision };
}
