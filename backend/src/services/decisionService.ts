import { LessThan } from "typeorm";
import type { Decision as DecisionDTO } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Decision } from "../entities/Decision.js";
import { DecisionFeedback } from "../entities/DecisionFeedback.js";
import { Project } from "../entities/Project.js";
import { AppError } from "../errors/index.js";
import { canUndo, getAction } from "../agents/actions.js";
import { logger } from "../utils/logger.js";

const decisions = () => AppDataSource.getRepository(Decision);
const feedback = () => AppDataSource.getRepository(DecisionFeedback);

/** Mappe une décision persistée vers le DTO partagé (point unique). */
export function decisionToDTO(d: Decision): DecisionDTO {
  return {
    id: d.id,
    projectId: d.projectId,
    agent: d.agent,
    anomalyId: d.anomalyId ?? undefined,
    title: d.title,
    rationale: d.rationale,
    actions: d.actions,
    confidence: d.confidence,
    status: d.status,
    actionType: d.actionType,
    autoApproved: d.autoApproved,
    executedAt: d.executedAt?.toISOString(),
    undoneAt: d.undoneAt?.toISOString(),
    approvalDeadline: d.approvalDeadline?.toISOString(),
    createdAt: d.createdAt.toISOString(),
  };
}

/** Charge une décision ET vérifie que son projet appartient à l'utilisateur. */
export async function loadOwnedDecision(userId: string, decisionId: string): Promise<Decision> {
  const d = await decisions().findOne({ where: { id: decisionId } });
  if (!d) throw new AppError(404, "not_found", "Décision introuvable");
  const project = await AppDataSource.getRepository(Project).findOne({
    where: { id: d.projectId },
  });
  if (!project || project.ownerId !== userId) {
    throw new AppError(403, "forbidden", "Accès refusé à cette décision");
  }
  return d;
}

/** Décisions d'un projet, les plus récentes d'abord. */
export async function listDecisions(projectId: string): Promise<DecisionDTO[]> {
  const rows = await decisions().find({
    where: { projectId },
    order: { createdAt: "DESC" },
    take: 100,
  });
  return rows.map(decisionToDTO);
}

/**
 * Enregistre un retour humain (alimente la boucle d'apprentissage) et fige le
 * statut accepté/rejeté. Renvoie la décision mise à jour.
 */
export async function submitFeedback(
  userId: string,
  decisionId: string,
  accepted: boolean,
  comment?: string,
): Promise<Decision> {
  const d = await decisions().findOne({ where: { id: decisionId } });
  if (!d) throw new AppError(404, "not_found", "Décision introuvable");
  await feedback().save(
    feedback().create({
      decisionId: d.id,
      accepted,
      comment: comment ?? null,
      authorId: userId,
    }),
  );
  d.status = accepted ? "accepted" : "rejected";
  return decisions().save(d);
}

/** Exécute l'action d'une décision et enregistre les snapshots (rollback). */
export async function executeDecision(d: Decision): Promise<Decision> {
  const action = getAction(d.actionType);
  if (!action) throw new AppError(400, "no_action", "Décision sans action exécutable");
  const { before, after } = await action.execute(d);
  d.beforeSnapshot = before;
  d.afterSnapshot = after;
  d.status = "executed";
  d.executedAt = new Date();
  logger.info({ decisionId: d.id, actionType: d.actionType }, "Décision exécutée");
  return decisions().save(d);
}

/** Approuve une décision en attente → exécute son action. */
export async function approveDecision(d: Decision): Promise<Decision> {
  if (d.status === "executed" || d.status === "undone" || d.status === "rejected") {
    throw new AppError(409, "already_handled", "Décision déjà traitée");
  }
  return executeDecision(d);
}

/** Rejette une décision (aucune exécution). */
export async function rejectDecision(d: Decision): Promise<Decision> {
  if (d.status === "executed") {
    throw new AppError(409, "already_executed", "Décision déjà exécutée — utilisez l'annulation");
  }
  d.status = "rejected";
  return decisions().save(d);
}

/** Annule une action exécutée en restaurant l'état « avant » (≤ 24 h). */
export async function undoDecision(d: Decision): Promise<Decision> {
  if (d.status !== "executed") {
    throw new AppError(409, "not_executed", "Aucune action exécutée à annuler");
  }
  if (!canUndo(d.executedAt)) {
    throw new AppError(409, "undo_window_closed", "Fenêtre d'annulation de 24 h dépassée");
  }
  const action = getAction(d.actionType);
  if (action && d.beforeSnapshot) await action.undo(d, d.beforeSnapshot);
  d.status = "undone";
  d.undoneAt = new Date();
  logger.info({ decisionId: d.id }, "Décision annulée (rollback)");
  return decisions().save(d);
}

/** Simule l'effet d'une action sans l'appliquer (before/after). */
export async function simulateDecision(d: Decision): Promise<{
  actionType: string;
  label: string;
  before: unknown;
  after: unknown;
}> {
  const action = getAction(d.actionType);
  if (!action) {
    return { actionType: d.actionType, label: "Aucune action", before: null, after: null };
  }
  const { before, after } = await action.simulate(d);
  return { actionType: d.actionType, label: action.label, before, after };
}

/** Expire les approbations en attente dont le délai est dépassé (maintenance). */
export async function expireStaleApprovals(): Promise<number> {
  const res = await decisions().update(
    { status: "pending_approval", approvalDeadline: LessThan(new Date()) },
    { status: "expired" },
  );
  return res.affected ?? 0;
}
