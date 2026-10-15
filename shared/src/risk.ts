/** Registre des risques (probabilité × impact). */

export type RiskStatus = "open" | "mitigating" | "closed";

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  /** Probabilité 1..5. */
  probability: number;
  /** Impact 1..5. */
  impact: number;
  /** Score = probabilité × impact (1..25). */
  score: number;
  /** Niveau dérivé du score. */
  severity: "low" | "medium" | "high";
  /** Propriétaire du risque (texte libre). */
  owner?: string;
  /** Tolérance / seuil d'acceptation (texte libre). */
  tolerance?: string;
  status: RiskStatus;
  createdAt: string;
}
