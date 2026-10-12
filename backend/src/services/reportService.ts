import type {
  Report as ReportDTO,
  ReportPeriod,
} from "@projectmaster/shared";
import { Between } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { Report } from "../entities/Report.js";
import { Signal } from "../entities/Signal.js";
import * as anomalyService from "./anomalyService.js";
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
): Promise<ReportDTO> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - PERIOD_DAYS[period]);

  const signalCount = await signals().count({
    where: { projectId, occurredAt: Between(periodStart, periodEnd) },
  });
  const anomalies = await anomalyService.listOpen(projectId);

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

  if (!summary) summary = heuristicSummary(projectName, signalCount, anomalies);

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

function heuristicSummary(
  projectName: string,
  signalCount: number,
  anomalies: Awaited<ReturnType<typeof anomalyService.listOpen>>,
): string {
  const critical = anomalies.filter((a) => a.severity === "critical");
  const warning = anomalies.filter((a) => a.severity === "warning");

  const lines: string[] = [
    `## Synthèse — ${projectName}`,
    "",
    `Sur la période, ${signalCount} signaux ont été collectés et ` +
      `${anomalies.length} anomalie(s) restent ouvertes ` +
      `(${critical.length} critique(s), ${warning.length} à surveiller).`,
    "",
    "**Points d'attention**",
  ];
  if (anomalies.length === 0) {
    lines.push("- Aucun — le projet est nominal.");
  } else {
    for (const a of anomalies.slice(0, 5)) lines.push(`- ${a.explanation}`);
  }
  lines.push("", "**Recommandations**");
  if (critical.length > 0) {
    lines.push("- Traiter en priorité les anomalies critiques.");
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
