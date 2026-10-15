import type { Risk as RiskDTO } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Risk } from "../entities/Risk.js";
import { Anomaly } from "../entities/Anomaly.js";
import { AppError } from "../errors/index.js";

const risks = () => AppDataSource.getRepository(Risk);

/** Niveau de sévérité dérivé du score probabilité × impact (1..25). */
export function severityOf(score: number): RiskDTO["severity"] {
  if (score >= 15) return "high";
  if (score >= 6) return "medium";
  return "low";
}

function toDTO(r: Risk): RiskDTO {
  const score = r.probability * r.impact;
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.description ?? undefined,
    probability: r.probability,
    impact: r.impact,
    score,
    severity: severityOf(score),
    owner: r.owner ?? undefined,
    tolerance: r.tolerance ?? undefined,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

const clamp15 = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

export async function listRisks(projectId: string): Promise<RiskDTO[]> {
  const rows = await risks().find({ where: { projectId }, order: { createdAt: "DESC" } });
  // Tri par score décroissant (les plus graves en tête).
  return rows.map(toDTO).sort((a, b) => b.score - a.score);
}

export async function createRisk(
  projectId: string,
  data: {
    title: string;
    description?: string;
    probability?: number;
    impact?: number;
    owner?: string;
    tolerance?: string;
  },
): Promise<RiskDTO> {
  const saved = await risks().save(
    risks().create({
      projectId,
      title: data.title,
      description: data.description ?? null,
      probability: clamp15(data.probability ?? 3),
      impact: clamp15(data.impact ?? 3),
      owner: data.owner ?? null,
      tolerance: data.tolerance ?? null,
    }),
  );
  return toDTO(saved);
}

export async function updateRisk(
  projectId: string,
  id: string,
  changes: Partial<{
    title: string;
    description: string | null;
    probability: number;
    impact: number;
    owner: string | null;
    tolerance: string | null;
    status: RiskDTO["status"];
  }>,
): Promise<RiskDTO> {
  const r = await risks().findOne({ where: { id, projectId } });
  if (!r) throw new AppError(404, "not_found", "Risque introuvable");
  if (changes.title !== undefined) r.title = changes.title;
  if (changes.description !== undefined) r.description = changes.description;
  if (changes.probability !== undefined) r.probability = clamp15(changes.probability);
  if (changes.impact !== undefined) r.impact = clamp15(changes.impact);
  if (changes.owner !== undefined) r.owner = changes.owner;
  if (changes.tolerance !== undefined) r.tolerance = changes.tolerance;
  if (changes.status !== undefined) r.status = changes.status;
  return toDTO(await risks().save(r));
}

export async function deleteRisk(projectId: string, id: string): Promise<void> {
  const r = await risks().findOne({ where: { id, projectId } });
  if (!r) throw new AppError(404, "not_found", "Risque introuvable");
  await risks().delete({ id });
}

/** Crée un risque pré-rempli à partir d'une anomalie ouverte du projet. */
export async function createRiskFromAnomaly(
  projectId: string,
  anomalyId: string,
): Promise<RiskDTO> {
  const anomaly = await AppDataSource.getRepository(Anomaly).findOne({
    where: { id: anomalyId, projectId },
  });
  if (!anomaly) throw new AppError(404, "not_found", "Anomalie introuvable");
  // L'impact dérive de la sévérité de l'anomalie ; la probabilité est posée à
  // « probable » par défaut (l'anomalie est déjà observée).
  const impact = anomaly.severity === "critical" ? 5 : anomaly.severity === "warning" ? 3 : 2;
  return createRisk(projectId, {
    title: `${anomaly.metric} — ${anomaly.explanation}`.slice(0, 200),
    description: `Issu de l'anomalie du ${anomaly.detectedAt.toISOString().slice(0, 10)} (z=${anomaly.zScore.toFixed(1)}).`,
    probability: 4,
    impact,
  });
}
