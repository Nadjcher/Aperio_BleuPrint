import type { AgentContext, AgentKind, Decision } from "@projectmaster/shared";

/** Décision produite par un agent, sans les champs attribués au stockage. */
export type DraftDecision = Omit<Decision, "id" | "createdAt" | "status">;

/** Contrat commun aux 4 agents autonomes. */
export interface Agent {
  readonly kind: AgentKind;
  /** Produit zéro, une ou plusieurs décisions à partir du contexte. */
  run(ctx: AgentContext): Promise<DraftDecision[]>;
}
