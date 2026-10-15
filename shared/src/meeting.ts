/** Compte rendu de réunion structuré (agent « compte rendu »). */

/** Une action issue de la réunion (responsable et échéance si mentionnés). */
export interface MinutesAction {
  description: string;
  owner?: string | null;
  due?: string | null;
}

/** Compte rendu structuré d'une réunion, stocké par projet. */
export interface MeetingMinutes {
  id: string;
  projectId: string;
  title: string;
  /** Résumé en quelques phrases. */
  summary: string;
  /** Décisions prises. */
  decisions: string[];
  /** Actions à mener. */
  actions: MinutesAction[];
  /** Risques ou points d'alerte soulevés. */
  risks: string[];
  /** Questions ouvertes / points à clarifier. */
  openQuestions: string[];
  /** Produit par le LLM (« llm ») ou par l'extraction déterministe (« heuristic »). */
  generatedBy: "llm" | "heuristic";
  createdAt: string;
}

/** Corps de création d'un compte rendu (notes brutes en entrée). */
export interface CreateMinutesDTO {
  title: string;
  /** Notes de réunion (texte collé ou texte extrait d'un document). */
  text: string;
}
