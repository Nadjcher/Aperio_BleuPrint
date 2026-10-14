import type { Briefing, BriefingItem, BriefingPriority } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { Anomaly } from "../entities/Anomaly.js";
import { Decision } from "../entities/Decision.js";

/** Données agrégées d'un projet pour le briefing (entrée pure, testable). */
export interface ProjectBrief {
  projectId: string;
  projectName: string;
  criticalAnomalies: string[]; // explications
  warningCount: number;
  openCount: number;
  pendingDecisions: { id: string; title: string; rationale: string }[];
}

const ORDER: Record<BriefingPriority, number> = {
  critical: 0,
  important: 1,
  fyi: 2,
  win: 3,
};

/**
 * Compose un briefing priorisé à partir des données agrégées. Fonction PURE
 * (pas d'accès base) → testable et déterministe.
 */
export function composeBriefing(projects: ProjectBrief[], now: Date): Briefing {
  const items: BriefingItem[] = [];

  for (const p of projects) {
    const to = `/projects/${p.projectId}`;

    for (const explanation of p.criticalAnomalies) {
      items.push({
        priority: "critical",
        title: `Risque critique — ${p.projectName}`,
        detail: explanation,
        projectId: p.projectId,
        projectName: p.projectName,
        actions: [{ label: "Ouvrir le projet", to }],
      });
    }

    for (const d of p.pendingDecisions) {
      items.push({
        priority: "important",
        title: d.title,
        detail: d.rationale,
        projectId: p.projectId,
        projectName: p.projectName,
        actions: [{ label: "Examiner & approuver", to }],
      });
    }

    if (p.warningCount > 0) {
      items.push({
        priority: "fyi",
        title: `${p.warningCount} anomalie(s) à surveiller — ${p.projectName}`,
        detail: "Aucune action urgente, mais à garder à l'œil.",
        projectId: p.projectId,
        projectName: p.projectName,
        actions: [{ label: "Voir", to }],
      });
    }

    if (p.openCount === 0 && p.pendingDecisions.length === 0) {
      items.push({
        priority: "win",
        title: `${p.projectName} : sur les rails`,
        detail: "Aucune anomalie ouverte — rien à faire, continuez ainsi.",
        projectId: p.projectId,
        projectName: p.projectName,
        actions: [{ label: "Voir", to }],
      });
    }
  }

  items.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);

  const counts: Record<BriefingPriority, number> = {
    critical: 0,
    important: 0,
    fyi: 0,
    win: 0,
  };
  for (const it of items) counts[it.priority] += 1;

  const greeting =
    counts.critical > 0
      ? `Bonjour. ${counts.critical} risque(s) critique(s) à traiter aujourd'hui.`
      : counts.important > 0
        ? `Bonjour. ${counts.important} décision(s) attendent votre approbation.`
        : projects.length === 0
          ? "Bonjour. Reliez un projet pour commencer."
          : "Bonjour. Tout est sous contrôle — rien d'urgent.";

  return { greeting, generatedAt: now.toISOString(), items, counts };
}

/** Construit le briefing de l'utilisateur à partir de ses projets. */
export async function buildBriefing(userId: string): Promise<Briefing> {
  const projects = await AppDataSource.getRepository(Project).find({
    where: { ownerId: userId },
    order: { createdAt: "DESC" },
  });

  const anomalies = AppDataSource.getRepository(Anomaly);
  const decisions = AppDataSource.getRepository(Decision);

  const briefs: ProjectBrief[] = [];
  for (const p of projects) {
    const open = await anomalies.find({
      where: { projectId: p.id, status: "open" },
    });
    const pending = await decisions.find({
      where: { projectId: p.id, status: "pending_approval" },
      order: { createdAt: "DESC" },
    });
    briefs.push({
      projectId: p.id,
      projectName: p.name,
      criticalAnomalies: open.filter((a) => a.severity === "critical").map((a) => a.explanation),
      warningCount: open.filter((a) => a.severity === "warning").length,
      openCount: open.length,
      pendingDecisions: pending.map((d) => ({ id: d.id, title: d.title, rationale: d.rationale })),
    });
  }

  return composeBriefing(briefs, new Date());
}
