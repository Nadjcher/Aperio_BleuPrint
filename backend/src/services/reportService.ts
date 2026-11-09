import type {
  Methodology,
  Report as ReportDTO,
  ReportPeriod,
  ReportRag,
} from "@projectmaster/shared";
import { vocabOf, REPORT_RAG_META } from "@projectmaster/shared";
import { Between, LessThan } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { Report } from "../entities/Report.js";
import { Signal } from "../entities/Signal.js";
import * as anomalyService from "./anomalyService.js";
import { getPlan } from "./planService.js";
import { listRisks } from "./riskService.js";
import { listDecisions } from "./decisionService.js";
import { complete, isLLMEnabled } from "../llm/index.js";
import { statusReportPrompt, type StatusReportFacts } from "../llm/prompts.js";

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
    rag: r.rag ?? "orange",
    headline: r.headline ?? "",
    summary: r.summary,
    generatedBy: r.generatedBy,
    createdAt: r.createdAt.toISOString(),
  };
}

// ── Statut RAG (PUR, déterministe — jamais confié au LLM) ─────────────────────

interface RagInput {
  criticalAnomalies: number;
  warningAnomalies: number;
  lateMilestones: string[];
  highRisks: string[];
  mediumRisks: number;
  deliveryUnknown: boolean;
}

/**
 * Calcule le statut RAG et sa justification à partir des faits. Fiable et
 * déterministe : le statut d'un point d'avancement ne doit pas dépendre de
 * l'humeur d'un LLM.
 */
export function computeRag(i: RagInput): { rag: ReportRag; headline: string } {
  const red: string[] = [];
  if (i.lateMilestones.length)
    red.push(`${i.lateMilestones.length} jalon(s) en retard probable`);
  if (i.criticalAnomalies) red.push(`${i.criticalAnomalies} anomalie(s) critique(s)`);
  if (i.highRisks.length) red.push(`${i.highRisks.length} risque(s) majeur(s)`);
  if (red.length) return { rag: "rouge", headline: `À traiter : ${red.join(" · ")}.` };

  const amber: string[] = [];
  if (i.warningAnomalies) amber.push(`${i.warningAnomalies} point(s) de vigilance`);
  if (i.mediumRisks) amber.push(`${i.mediumRisks} risque(s) à surveiller`);
  if (i.deliveryUnknown) amber.push("date de livraison non calculable");
  if (amber.length) return { rag: "orange", headline: `Vigilance : ${amber.join(" · ")}.` };

  return { rag: "vert", headline: "Projet dans les délais, aucun point bloquant." };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

function deliveryLabel(d: Awaited<ReturnType<typeof getPlan>>["delivery"]): string {
  if (d.weeks === null) return d.note ?? "Non calculable (vélocité manquante).";
  if (d.weeks === 0) return d.note ?? "Terminé.";
  return `${fmtDate(d.expected)} (entre ${fmtDate(d.optimistic)} et ${fmtDate(
    d.pessimistic,
  )}), confiance ${Math.round(d.confidence * 100)} %.`;
}

/**
 * Point d'avancement d'un projet, prêt à envoyer. Le statut RAG est calculé à
 * partir des données ; la prose est rédigée par le LLM (si disponible) sur la
 * base de faits riches, sinon par un gabarit heuristique structuré.
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

  const [signalCount, anomalies, plan, risks, decisions, previous] = await Promise.all([
    signals().count({ where: { projectId, occurredAt: Between(periodStart, periodEnd) } }),
    anomalyService.listOpen(projectId),
    getPlan(projectId),
    listRisks(projectId),
    listDecisions(projectId),
    reports().findOne({
      where: { projectId, createdAt: LessThan(periodEnd) },
      order: { createdAt: "DESC" },
    }),
  ]);

  const lateMs = plan.milestones.filter((m) => m.atRisk);
  const upcoming = plan.milestones
    .filter((m) => m.status !== "done" && !m.atRisk)
    .slice(0, 4);
  const openRisks = risks.filter((r) => r.status !== "closed");
  const highRisks = openRisks.filter((r) => r.severity === "high");
  const mediumRisks = openRisks.filter((r) => r.severity === "medium");
  const pendingDecisions = decisions.filter((d) => d.status === "pending_approval");

  const { rag, headline } = computeRag({
    criticalAnomalies: anomalies.filter((a) => a.severity === "critical").length,
    warningAnomalies: anomalies.filter((a) => a.severity === "warning").length,
    lateMilestones: lateMs.map((m) => m.name),
    highRisks: highRisks.map((r) => r.title),
    mediumRisks: mediumRisks.length,
    deliveryUnknown: plan.delivery.weeks === null,
  });

  const periodLabel = `${fmtDate(periodStart.toISOString())} → ${fmtDate(periodEnd.toISOString())}`;
  const sinceLabel = previous
    ? `dernier rapport du ${fmtDate(previous.createdAt.toISOString())}`
    : "premier rapport de ce projet";

  const facts: StatusReportFacts = {
    projectName,
    methodology: vocabOf(methodology).label,
    periodLabel,
    sinceLabel,
    rag,
    headline,
    signalCount,
    delivery: deliveryLabel(plan.delivery),
    lateMilestones: lateMs.map((m) => ({
      name: m.name,
      dueDate: fmtDate(m.dueDate),
      projectedEnd: fmtDate(m.projectedEnd),
    })),
    upcomingMilestones: upcoming.map((m) => ({ name: m.name, dueDate: fmtDate(m.dueDate) })),
    risks: openRisks
      .slice(0, 6)
      .map((r) => ({ title: r.title, severity: r.severity, score: r.score, owner: r.owner })),
    anomalies: anomalies.slice(0, 6).map((a) => ({ severity: a.severity, explanation: a.explanation })),
    pendingDecisions: pendingDecisions.map((d) => ({ title: d.title })),
  };

  let summary: string | null = null;
  let generatedBy: "llm" | "heuristic" = "heuristic";
  if (isLLMEnabled()) {
    const { system, user } = statusReportPrompt(facts);
    summary = await complete({ system, user, maxTokens: 1600 });
    if (summary) generatedBy = "llm";
  }
  if (!summary) summary = heuristicSummary(facts);

  const saved = await reports().save(
    reports().create({ projectId, period, periodStart, periodEnd, rag, headline, summary, generatedBy }),
  );
  return toDTO(saved);
}

/** Gabarit heuristique structuré (même format que la version LLM). */
function heuristicSummary(f: StatusReportFacts): string {
  const icon = REPORT_RAG_META[f.rag].icon;
  const L: string[] = [];
  L.push(`## Point d'avancement — ${f.projectName}`);
  L.push(`**Statut : ${icon} ${REPORT_RAG_META[f.rag].label}** — ${f.headline}`);
  L.push(`*Période : ${f.periodLabel} · ${f.sinceLabel} · ${f.methodology}*`, "");

  L.push("**Résumé exécutif**");
  L.push(
    `- ${f.signalCount} signaux d'activité sur la période. ` +
      (f.lateMilestones.length
        ? `${f.lateMilestones.length} jalon(s) en retard probable. `
        : "Pas de jalon en retard. ") +
      `Livraison prévue : ${f.delivery}`,
    "",
  );

  L.push("**Ce qui a avancé**");
  L.push(f.signalCount > 0 ? `- ${f.signalCount} événements d'activité enregistrés depuis le ${f.sinceLabel}.` : "- Rien à signaler.");
  L.push("");

  L.push("**À risque / en retard**");
  if (!f.lateMilestones.length && !f.risks.length) L.push("- Rien à signaler.");
  else {
    for (const m of f.lateMilestones)
      L.push(`- Jalon « ${m.name} » : échéance ${m.dueDate}, fin projetée ${m.projectedEnd}.`);
    for (const r of f.risks.filter((r) => r.severity !== "low"))
      L.push(`- Risque : ${r.title} (${r.severity}, score ${r.score}${r.owner ? `, ${r.owner}` : ""}).`);
  }
  L.push("");

  L.push("**Décisions attendues / besoins**");
  if (!f.pendingDecisions.length) L.push("- Rien à signaler.");
  else for (const d of f.pendingDecisions) L.push(`- ${d.title}`);
  L.push("");

  L.push("**Prochaines échéances**");
  if (!f.upcomingMilestones.length) L.push("- Rien à signaler.");
  else for (const m of f.upcomingMilestones) L.push(`- ${m.name} — échéance ${m.dueDate}.`);

  return L.join("\n");
}

export async function list(projectId: string): Promise<ReportDTO[]> {
  const rows = await reports().find({
    where: { projectId },
    order: { createdAt: "DESC" },
    take: 50,
  });
  return rows.map(toDTO);
}
