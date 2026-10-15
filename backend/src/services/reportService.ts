import type {
  Methodology,
  Report as ReportDTO,
  ReportPeriod,
} from "@projectmaster/shared";
import { vocabOf } from "@projectmaster/shared";
import { Between } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { Report } from "../entities/Report.js";
import { Signal } from "../entities/Signal.js";
import * as anomalyService from "./anomalyService.js";
import { getPlan } from "./planService.js";
import { listRisks } from "./riskService.js";
import { complete, isLLMEnabled } from "../llm/index.js";
import { reportPrompt } from "../llm/prompts.js";

const reports = () => AppDataSource.getRepository(Report);
const signals = () => AppDataSource.getRepository(Signal);

const PERIOD_DAYS: Record<ReportPeriod, number> = { weekly: 7, monthly: 30 };

function toDTO(r: Report): ReportDTO {
  return {
    id: r.id,
    projectId: r.projectId,
    period: r.period,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    summary: r.summary,
    generatedBy: r.generatedBy,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Synthèse de l'état d'un projet sur une période. Utilise le LLM si
 * disponible (document synthesis), sinon un gabarit heuristique.
 */
export async function generate(
  projectId: string,
  projectName: string,
  period: ReportPeriod,
  methodology: Methodology = "kanban",
): Promise<ReportDTO> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - PERIOD_DAYS[period]);

  const [signalCount, anomalies, plan, risks] = await Promise.all([
    signals().count({ where: { projectId, occurredAt: Between(periodStart, periodEnd) } }),
    anomalyService.listOpen(projectId),
    getPlan(projectId),
    listRisks(projectId),
  ]);

  let summary: string | null = null;
  let generatedBy: "llm" | "heuristic" = "heuristic";

  if (isLLMEnabled()) {
    const periodLabel = `${periodStart.toISOString().slice(0, 10)} → ${periodEnd
      .toISOString()
      .slice(0, 10)}`;
    const { system, user } = reportPrompt({
      projectName,
      period: periodLabel,
      signalCount,
      anomalies,
    });
    summary = await complete({ system, user, maxTokens: 1500 });
    if (summary) generatedBy = "llm";
  }

  if (!summary) {
    summary = heuristicSummary(projectName, methodology, signalCount, anomalies, plan, risks);
  }

  const saved = await reports().save(
    reports().create({
      projectId,
      period,
      periodStart,
      periodEnd,
      summary,
      generatedBy,
    }),
  );
  return toDTO(saved);
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

function heuristicSummary(
  projectName: string,
  methodology: Methodology,
  signalCount: number,
  anomalies: Awaited<ReturnType<typeof anomalyService.listOpen>>,
  plan: Awaited<ReturnType<typeof getPlan>>,
  risks: Awaited<ReturnType<typeof listRisks>>,
): string {
  const v = vocabOf(methodology);
  const critical = anomalies.filter((a) => a.severity === "critical");
  const warning = anomalies.filter((a) => a.severity === "warning");
  const lateMs = plan.milestones.filter((m) => m.atRisk);
  const topRisks = risks.filter((r) => r.status !== "closed").slice(0, 5);

  // En-tête normé selon la méthodologie (Highlight PRINCE2, burndown Scrum, …).
  const lines: string[] = [`## ${v.report} — ${projectName}`, `*Méthodologie : ${v.label}*`, ""];

  lines.push("**État**");
  lines.push(
    `- ${signalCount} signaux sur la période · ${anomalies.length} ${v.milestone === "étape" ? "point(s) d'attention" : "anomalie(s)"} ouverte(s) ` +
      `(${critical.length} critique(s), ${warning.length} à surveiller).`,
  );

  lines.push("", "**Date de livraison prévue**");
  if (plan.delivery.weeks === null) {
    lines.push(`- ${plan.delivery.note ?? "Non calculable (vélocité manquante)."}`);
  } else if (plan.delivery.weeks === 0) {
    lines.push(`- ${plan.delivery.note ?? "Terminé."}`);
  } else {
    lines.push(
      `- ${fmtDate(plan.delivery.expected)} (entre ${fmtDate(plan.delivery.optimistic)} et ` +
        `${fmtDate(plan.delivery.pessimistic)}) · confiance ${Math.round(plan.delivery.confidence * 100)}%.`,
    );
  }
  if (lateMs.length > 0) {
    lines.push(
      `- ⚠ ${lateMs.length} ${lateMs.length > 1 ? v.milestonePlural : v.milestone} en retard probable : ` +
        lateMs.map((m) => m.name).join(", ") + ".",
    );
  }

  lines.push("", "**Risques majeurs**");
  if (topRisks.length === 0) {
    lines.push("- Aucun risque ouvert au registre.");
  } else {
    for (const r of topRisks) {
      lines.push(`- [${r.severity}] ${r.title} (score ${r.score}${r.owner ? `, ${r.owner}` : ""}).`);
    }
  }

  lines.push("", "**Points d'attention**");
  if (anomalies.length === 0) lines.push("- Aucun — le projet est nominal.");
  else for (const a of anomalies.slice(0, 5)) lines.push(`- ${a.explanation}`);

  lines.push("", "**Recommandations**");
  if (critical.length > 0 || lateMs.length > 0) {
    lines.push("- Traiter en priorité les points critiques et les retards probables.");
    lines.push("- Consulter les décisions des agents Analyst et Planner.");
  } else {
    lines.push("- Maintenir le rythme ; aucune action urgente.");
  }
  return lines.join("\n");
}

export async function list(projectId: string): Promise<ReportDTO[]> {
  const rows = await reports().find({
    where: { projectId },
    order: { createdAt: "DESC" },
    take: 50,
  });
  return rows.map(toDTO);
}
