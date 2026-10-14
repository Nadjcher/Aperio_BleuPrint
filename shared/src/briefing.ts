/** Briefing proactif : « Voici ce qu'il faut faire ». */

export type BriefingPriority = "critical" | "important" | "fyi" | "win";

export interface BriefingAction {
  label: string;
  /** Route front vers laquelle diriger l'utilisateur. */
  to: string;
}

export interface BriefingItem {
  priority: BriefingPriority;
  title: string;
  detail: string;
  projectId?: string;
  projectName?: string;
  actions: BriefingAction[];
}

export type RiskLevel = "faible" | "moyen" | "élevé";

/** Synthèse « mode simple » : santé globale + niveau de risque. */
export interface HealthSummary {
  /** Score 0..100 (100 = tout va bien). */
  score: number;
  risk: RiskLevel;
}

export interface Briefing {
  greeting: string;
  generatedAt: string;
  items: BriefingItem[];
  counts: Record<BriefingPriority, number>;
  /** Santé agrégée du portefeuille (mode simple). */
  health: HealthSummary;
  /** Activité (signaux ingérés) sur les 7 derniers jours, tous projets. */
  activity7d: number;
}
