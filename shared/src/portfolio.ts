/** Carte du portefeuille : briques, dépendances et états calculés. */

export type BlockState = "vert" | "orange" | "rouge";
export type BlockSource = "jira" | "github" | "gitlab" | "linear" | "manuel";
export type LinkType = "depends_on" | "touches";

/** Une brique du portefeuille (API, application, lot…). */
export interface Block {
  id: string;
  projectId: string;
  name: string;
  /** Type libre, ex. "API", "application", "lot". */
  type: string;
  ownerId: string | null;
  /** Date cible (ISO "YYYY-MM-DD"), nullable. */
  targetDate: string | null;
  /** Dernière activité (ISO 8601), nullable. */
  lastActivityAt: string | null;
  source: BlockSource;
  sourceRef: string | null;
  /** URL externe « Ouvrir dans … » (construite à l'import), nullable. */
  sourceUrl: string | null;
}

/** Lien typé entre deux briques (fromId dépend de toId pour DEPENDS_ON). */
export interface BlockLink {
  id: string;
  fromId: string;
  toId: string;
  type: LinkType;
}

/** Brique enrichie de son état calculé (+ libellés d'affichage). */
export interface BlockWithState extends Block {
  state: BlockState;
  /** Raison lisible de l'état (ex. « Dépend de X, en rouge »). */
  reason: string;
  /** Nombre de briques en aval qui deviennent rouges à cause de celle-ci. */
  bloque: number;
  projectName?: string;
  ownerName?: string | null;
}

/** Un bloqueur : brique rouge par sa propre échéance, et son impact aval. */
export interface PortfolioBlocker {
  id: string;
  name: string;
  bloque: number;
}

/** Résultat complet de la carte du portefeuille. */
export interface PortfolioMap {
  blocks: BlockWithState[];
  links: BlockLink[];
  /** Bloqueurs triés par nombre de briques bloquées (décroissant). */
  blockers: PortfolioBlocker[];
  /** Avertissements (cycles de dépendances détectés). */
  warnings: string[];
  /** Phrase unique résumant l'état du portefeuille. */
  headline: string;
}

export const BLOCK_STATE_META: Record<BlockState, { label: string; icon: string }> = {
  vert: { label: "Dans les délais", icon: "●" },
  orange: { label: "À surveiller", icon: "▲" },
  rouge: { label: "En retard", icon: "■" },
};
