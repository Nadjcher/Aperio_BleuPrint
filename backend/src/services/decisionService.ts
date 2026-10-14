import { LessThan } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { Decision } from "../entities/Decision.js";
import { AppError } from "../middleware/errorHandler.js";
import { canUndo, getAction } from "../agents/actions.js";
import { logger } from "../utils/logger.js";

const decisions = () => AppDataSource.getRepository(Decision);

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
