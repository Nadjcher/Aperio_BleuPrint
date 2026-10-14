import type { AnomalyStatus, DecisionActionType } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Anomaly } from "../entities/Anomaly.js";
import type { Decision } from "../entities/Decision.js";
import { AppError } from "../middleware/errorHandler.js";

const anomalies = () => AppDataSource.getRepository(Anomaly);

export interface Snapshot {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/** Une action concrète et réversible exécutable par une décision. */
export interface ActionSpec {
  type: DecisionActionType;
  /** Exécutée sans approbation humaine ? (true = impact faible) */
  autoApproved: boolean;
  label: string;
  /** Prévisualise l'effet sans l'appliquer (simulation before/after). */
  simulate(decision: Decision): Promise<Snapshot>;
  /** Applique l'action et renvoie les snapshots avant/après. */
  execute(decision: Decision): Promise<Snapshot>;
  /** Annule l'action en restaurant l'état « avant ». */
  undo(decision: Decision, before: Record<string, unknown>): Promise<void>;
}

async function loadAnomaly(decision: Decision): Promise<Anomaly> {
  if (!decision.anomalyId) {
    throw new AppError(400, "no_anomaly", "Décision sans anomalie cible");
  }
  const a = await anomalies().findOne({ where: { id: decision.anomalyId } });
  if (!a) throw new AppError(404, "not_found", "Anomalie introuvable");
  return a;
}

/** Fabrique une action qui change le statut d'une anomalie (réversible). */
function anomalyStatusAction(
  type: DecisionActionType,
  target: AnomalyStatus,
  autoApproved: boolean,
  label: string,
): ActionSpec {
  return {
    type,
    autoApproved,
    label,
    async simulate(decision) {
      const a = await loadAnomaly(decision);
      return { before: { status: a.status }, after: { status: target } };
    },
    async execute(decision) {
      const a = await loadAnomaly(decision);
      const before = { status: a.status };
      a.status = target;
      await anomalies().save(a);
      return { before, after: { status: target } };
    },
    async undo(decision, before) {
      const a = await loadAnomaly(decision);
      a.status = (before.status as AnomalyStatus) ?? "open";
      await anomalies().save(a);
    },
  };
}

const REGISTRY: Record<string, ActionSpec> = {
  "anomaly.acknowledge": anomalyStatusAction(
    "anomaly.acknowledge",
    "acknowledged",
    true, // impact faible → auto-approuvé
    "Accuser réception de l'anomalie",
  ),
  "anomaly.resolve": anomalyStatusAction(
    "anomaly.resolve",
    "resolved",
    false, // nécessite approbation
    "Marquer l'anomalie comme résolue",
  ),
  "anomaly.dismiss": anomalyStatusAction(
    "anomaly.dismiss",
    "dismissed",
    false,
    "Écarter l'anomalie (faux positif)",
  ),
};

/** Récupère l'action pour un type donné (null si aucune / "none"). */
export function getAction(type: DecisionActionType | undefined): ActionSpec | null {
  if (!type || type === "none") return null;
  return REGISTRY[type] ?? null;
}

/** Politique : une action est-elle auto-approuvée ? (helper pur, testable) */
export function isAutoApproved(type: DecisionActionType | undefined): boolean {
  return getAction(type)?.autoApproved ?? false;
}

/** Fenêtre de rollback après exécution. */
export const UNDO_WINDOW_MS = 24 * 3600 * 1000;

/** Peut-on encore annuler ? (helper pur, testable) */
export function canUndo(executedAt: Date | null, now: number = Date.now()): boolean {
  if (!executedAt) return false;
  return now - executedAt.getTime() <= UNDO_WINDOW_MS;
}
