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

export interface Briefing {
  greeting: string;
  generatedAt: string;
  items: BriefingItem[];
  counts: Record<BriefingPriority, number>;
}
