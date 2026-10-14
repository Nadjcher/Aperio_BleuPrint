import type { AgentContext, AgentKind, Decision } from "@projectmaster/shared";

/**
 * Décision produite par un agent. L'agent peut fixer `actionType` ; les champs
 * de cycle de vie (statut, approbation, snapshots) sont gérés par l'orchestrateur.
 */
export type DraftDecision = Omit<
  Decision,
  | "id"
  | "createdAt"
  | "status"
  | "autoApproved"
  | "executedAt"
  | "undoneAt"
  | "approvalDeadline"
>;

/** Contrat commun aux 4 agents autonomes. */
export interface Agent {
  readonly kind: AgentKind;
  /** Produit zéro, une ou plusieurs décisions à partir du contexte. */
  run(ctx: AgentContext): Promise<DraftDecision[]>;
}
