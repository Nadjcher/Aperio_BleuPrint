/** Modèle de planning : jalons, tâches, date de livraison prévue. */

export type MilestoneStatus = "pending" | "done";
export type TaskStatus = "todo" | "doing" | "done";

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  /** Échéance cible (ISO date), optionnelle. */
  dueDate?: string;
  status: MilestoneStatus;
  /** Ordre d'affichage / de séquencement. */
  orderIndex: number;
  /** Jalon prérequis (dépendance), optionnel. */
  dependsOnId?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  /** Jalon de rattachement, optionnel. */
  milestoneId?: string;
  title: string;
  /** Estimation d'effort (points). */
  effortPoints: number;
  status: TaskStatus;
  createdAt: string;
}

/** Fourchette de date de livraison prévue (avec incertitude). */
export interface DeliveryForecast {
  /** Rythme d'avancement utilisé (points/semaine). */
  velocity: number;
  /** Effort restant (points des tâches non terminées). */
  remainingEffort: number;
  /** Semaines estimées jusqu'à la fin (centre de la fourchette). */
  weeks: number | null;
  /** Dates optimiste / attendue / pessimiste (ISO), si calculables. */
  optimistic?: string;
  expected?: string;
  pessimistic?: string;
  /** 0..1 : confiance (monte avec l'historique de tâches terminées). */
  confidence: number;
  /** Motif quand la date n'est pas calculable (ex. vélocité nulle). */
  note?: string;
}

/** Jalon enrichi d'une projection (fin estimée + risque de retard). */
export interface MilestonePlan extends Milestone {
  /** Effort restant rattaché à ce jalon. */
  remainingEffort: number;
  /** Fin projetée (ISO) selon la vélocité, si calculable. */
  projectedEnd?: string;
  /** Vrai si la fin projetée dépasse l'échéance. */
  atRisk: boolean;
  /** Sur le chemin critique (mode expert). */
  onCriticalPath: boolean;
}

export interface ProjectPlan {
  projectId: string;
  delivery: DeliveryForecast;
  milestones: MilestonePlan[];
  /** Ids des jalons du chemin critique, dans l'ordre. */
  criticalPath: string[];
}
