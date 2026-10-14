/** Modèle commun aux 4 agents autonomes. */

export type AgentKind = "monitor" | "analyst" | "planner" | "reporter";

export type DecisionStatus =
  | "proposed" // produite, en attente d'exécution/approbation
  | "accepted" // retour humain positif (apprentissage)
  | "rejected" // refusée
  | "applied"
  | "superseded"
  | "pending_approval" // action nécessitant une approbation humaine
  | "executed" // action exécutée (réversible 24 h)
  | "undone" // action annulée (rollback)
  | "expired"; // approbation non donnée dans les délais

/** Type d'action concrète et RÉVERSIBLE qu'une décision peut exécuter. */
export type DecisionActionType =
  | "none"
  | "anomaly.acknowledge"
  | "anomaly.resolve"
  | "anomaly.dismiss";

/** Une décision ou recommandation produite par un agent. */
export interface Decision {
  id: string;
  projectId: string;
  agent: AgentKind;
  /** Anomalie déclencheuse, le cas échéant. */
  anomalyId?: string;
  /** Résumé court de l'action proposée. */
  title: string;
  /** Justification détaillée. */
  rationale: string;
  /** Actions concrètes suggérées. */
  actions: string[];
  /** Confiance de l'agent dans sa décision (0..1). */
  confidence: number;
  status: DecisionStatus;
  /** Action exécutable associée (none = simple recommandation). */
  actionType?: DecisionActionType;
  /** Exécutée automatiquement (sans approbation) ? */
  autoApproved?: boolean;
  /** Horodatages du cycle de vie de l'action. */
  executedAt?: string;
  undoneAt?: string;
  /** Date limite pour approuver une action (sinon expiration). */
  approvalDeadline?: string;
  createdAt: string;
}

/** Retour humain sur une décision, alimente la boucle d'apprentissage. */
export interface DecisionFeedback {
  decisionId: string;
  /** L'humain a-t-il validé la décision ? */
  accepted: boolean;
  /** Commentaire libre optionnel. */
  comment?: string;
  createdAt: string;
}

/** Contexte fourni à un agent pour produire une décision. */
export interface AgentContext {
  projectId: string;
  anomalies: import("./anomalies.js").Anomaly[];
  metrics: import("./signals.js").SignalMetric[];
}
