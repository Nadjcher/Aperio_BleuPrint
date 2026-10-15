/** Réglages de notification par projet (le webhook n'est jamais renvoyé). */
export interface NotificationSettings {
  projectId: string;
  /** Vrai si un webhook Slack est enregistré (chiffré en base). */
  hasSlackWebhook: boolean;
  onAnomaly: boolean;
  onPendingDecision: boolean;
  updatedAt: string;
}
