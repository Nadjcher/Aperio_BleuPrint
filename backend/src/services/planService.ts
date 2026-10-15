import type {
  DeliveryForecast,
  Milestone as MilestoneDTO,
  MilestonePlan,
  ProjectPlan,
  Task as TaskDTO,
} from "@projectmaster/shared";
import { In } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { Milestone } from "../entities/Milestone.js";
import { Task } from "../entities/Task.js";
import { Assignment } from "../entities/Assignment.js";
import { AppError } from "../errors/index.js";
import { projectResourcing } from "./resourceService.js";

const milestones = () => AppDataSource.getRepository(Milestone);
const tasks = () => AppDataSource.getRepository(Task);

const DAY = 24 * 3600 * 1000;

// ─── Calcul pur (testable) ───────────────────────────────────────────────────

export interface PlanInput {
  milestones: MilestoneDTO[];
  tasks: TaskDTO[];
  velocity: number; // points/semaine
  now: Date;
}

function remainingByMilestone(input: PlanInput): Map<string | null, number> {
  const map = new Map<string | null, number>();
  for (const t of input.tasks) {
    if (t.status === "done") continue;
    const key = t.milestoneId ?? null;
    map.set(key, (map.get(key) ?? 0) + t.effortPoints);
  }
  return map;
}

/** Fourchette de date de livraison à partir de l'effort restant et de la vélocité. */
export function computeDelivery(input: PlanInput): DeliveryForecast {
  const remainingEffort = input.tasks
    .filter((t) => t.status !== "done")
    .reduce((s, t) => s + t.effortPoints, 0);
  const doneCount = input.tasks.filter((t) => t.status === "done").length;

  if (remainingEffort === 0) {
    return {
      velocity: input.velocity,
      remainingEffort: 0,
      weeks: 0,
      confidence: 0.9,
      note: input.tasks.length === 0 ? "Aucune tâche planifiée." : "Tout est terminé.",
    };
  }
  if (input.velocity <= 0) {
    return {
      velocity: 0,
      remainingEffort,
      weeks: null,
      confidence: 0.2,
      note: "Renseignez une vélocité (onglet Équipe) pour estimer la date.",
    };
  }

  const weeks = remainingEffort / input.velocity;
  // Incertitude : large quand peu de tâches sont terminées, se resserre ensuite.
  const band = Math.min(0.5, Math.max(0.2, 0.5 - doneCount * 0.03));
  const confidence = Math.min(0.9, Math.max(0.3, 0.3 + doneCount * 0.05));
  const at = (w: number) => new Date(input.now.getTime() + w * 7 * DAY).toISOString();

  return {
    velocity: input.velocity,
    remainingEffort,
    weeks: Math.round(weeks * 10) / 10,
    optimistic: at(weeks * (1 - band)),
    expected: at(weeks),
    pessimistic: at(weeks * (1 + band)),
    confidence,
  };
}

/** Chemin critique : la chaîne de dépendances au plus gros effort cumulé. */
export function criticalPath(
  ms: MilestoneDTO[],
  effortOf: Map<string, number>,
): string[] {
  const byId = new Map(ms.map((m) => [m.id, m]));
  const memo = new Map<string, { total: number; chain: string[] }>();

  const walk = (id: string, seen: Set<string>): { total: number; chain: string[] } => {
    const cached = memo.get(id);
    if (cached) return cached;
    const m = byId.get(id);
    if (!m || seen.has(id)) return { total: 0, chain: [] };
    seen.add(id);
    const self = effortOf.get(id) ?? 0;
    const dep = m.dependsOnId && byId.has(m.dependsOnId) ? walk(m.dependsOnId, seen) : { total: 0, chain: [] };
    seen.delete(id);
    const res = { total: self + dep.total, chain: [...dep.chain, id] };
    memo.set(id, res);
    return res;
  };

  let best: { total: number; chain: string[] } = { total: 0, chain: [] };
  for (const m of ms) {
    const r = walk(m.id, new Set());
    if (r.total > best.total) best = r;
  }
  return best.chain;
}

/** Calcule le plan complet (fonction PURE). */
export function computePlan(input: PlanInput): ProjectPlan {
  const remMap = remainingByMilestone(input);
  const ordered = [...input.milestones].sort((a, b) => a.orderIndex - b.orderIndex);

  const effortOf = new Map<string, number>();
  for (const m of ordered) effortOf.set(m.id, remMap.get(m.id) ?? 0);

  const cp = new Set(criticalPath(ordered, effortOf));

  let cumulative = 0;
  const planned: MilestonePlan[] = ordered.map((m) => {
    const remaining = remMap.get(m.id) ?? 0;
    let projectedEnd: string | undefined;
    let atRisk = false;
    if (m.status !== "done") {
      cumulative += remaining;
      if (input.velocity > 0) {
        const end = new Date(input.now.getTime() + (cumulative / input.velocity) * 7 * DAY);
        projectedEnd = end.toISOString();
        if (m.dueDate) atRisk = end.getTime() > new Date(m.dueDate).getTime();
      }
    }
    return {
      ...m,
      remainingEffort: remaining,
      projectedEnd,
      atRisk,
      onCriticalPath: cp.has(m.id),
    };
  });

  return {
    projectId: input.milestones[0]?.projectId ?? "",
    delivery: computeDelivery(input),
    milestones: planned,
    criticalPath: [...cp],
  };
}

// ─── Accès données & mapping ─────────────────────────────────────────────────

function mToDTO(m: Milestone): MilestoneDTO {
  return {
    id: m.id,
    projectId: m.projectId,
    name: m.name,
    dueDate: m.dueDate ?? undefined,
    status: m.status,
    orderIndex: m.orderIndex,
    dependsOnId: m.dependsOnId ?? undefined,
    createdAt: m.createdAt.toISOString(),
  };
}

function tToDTO(t: Task): TaskDTO {
  return {
    id: t.id,
    projectId: t.projectId,
    milestoneId: t.milestoneId ?? undefined,
    title: t.title,
    effortPoints: t.effortPoints,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function listMilestones(projectId: string): Promise<MilestoneDTO[]> {
  const rows = await milestones().find({
    where: { projectId },
    order: { orderIndex: "ASC", createdAt: "ASC" },
  });
  return rows.map(mToDTO);
}

export async function listTasks(projectId: string): Promise<TaskDTO[]> {
  const rows = await tasks().find({ where: { projectId }, order: { createdAt: "ASC" } });
  return rows.map(tToDTO);
}

export async function createMilestone(
  projectId: string,
  data: { name: string; dueDate?: string; orderIndex?: number; dependsOnId?: string },
): Promise<MilestoneDTO> {
  const saved = await milestones().save(
    milestones().create({
      projectId,
      name: data.name,
      dueDate: data.dueDate ?? null,
      orderIndex: data.orderIndex ?? 0,
      dependsOnId: data.dependsOnId ?? null,
    }),
  );
  return mToDTO(saved);
}

export async function updateMilestone(
  projectId: string,
  id: string,
  changes: Partial<{ name: string; dueDate: string | null; status: MilestoneDTO["status"]; orderIndex: number; dependsOnId: string | null }>,
): Promise<MilestoneDTO> {
  const m = await milestones().findOne({ where: { id, projectId } });
  if (!m) throw new AppError(404, "not_found", "Jalon introuvable");
  if (changes.name !== undefined) m.name = changes.name;
  if (changes.dueDate !== undefined) m.dueDate = changes.dueDate;
  if (changes.status !== undefined) m.status = changes.status;
  if (changes.orderIndex !== undefined) m.orderIndex = changes.orderIndex;
  if (changes.dependsOnId !== undefined) m.dependsOnId = changes.dependsOnId;
  return mToDTO(await milestones().save(m));
}

export async function deleteMilestone(projectId: string, id: string): Promise<void> {
  const m = await milestones().findOne({ where: { id, projectId } });
  if (!m) throw new AppError(404, "not_found", "Jalon introuvable");
  // Détache les tâches et les dépendances pointant vers ce jalon.
  await tasks().update({ milestoneId: id }, { milestoneId: null });
  await milestones().update({ dependsOnId: id }, { dependsOnId: null });
  await milestones().delete({ id });
}

export async function createTask(
  projectId: string,
  data: { title: string; effortPoints?: number; milestoneId?: string; status?: TaskDTO["status"] },
): Promise<TaskDTO> {
  const saved = await tasks().save(
    tasks().create({
      projectId,
      title: data.title,
      effortPoints: data.effortPoints ?? 1,
      milestoneId: data.milestoneId ?? null,
      status: data.status ?? "todo",
    }),
  );
  return tToDTO(saved);
}

export async function updateTask(
  projectId: string,
  id: string,
  changes: Partial<{ title: string; effortPoints: number; milestoneId: string | null; status: TaskDTO["status"] }>,
): Promise<TaskDTO> {
  const t = await tasks().findOne({ where: { id, projectId } });
  if (!t) throw new AppError(404, "not_found", "Tâche introuvable");
  if (changes.title !== undefined) t.title = changes.title;
  if (changes.effortPoints !== undefined) t.effortPoints = changes.effortPoints;
  if (changes.milestoneId !== undefined) t.milestoneId = changes.milestoneId;
  if (changes.status !== undefined) t.status = changes.status;
  return tToDTO(await tasks().save(t));
}

export async function deleteTask(projectId: string, id: string): Promise<void> {
  const t = await tasks().findOne({ where: { id, projectId } });
  if (!t) throw new AppError(404, "not_found", "Tâche introuvable");
  await tasks().delete({ id });
}

/** Charge jalons + tâches + vélocité (modèle d'équipe) et calcule le plan. */
export async function getPlan(projectId: string): Promise<ProjectPlan> {
  const [ms, ts, resourcing] = await Promise.all([
    listMilestones(projectId),
    listTasks(projectId),
    projectResourcing(projectId),
  ]);
  const plan = computePlan({
    milestones: ms,
    tasks: ts,
    velocity: resourcing.totalVelocity,
    now: new Date(),
  });
  return { ...plan, projectId };
}

/** Jalons à risque (fin projetée après l'échéance) — pour le briefing. */
export async function atRiskMilestones(
  projectId: string,
): Promise<{ name: string; dueDate?: string }[]> {
  const plan = await getPlan(projectId);
  return plan.milestones
    .filter((m) => m.atRisk)
    .map((m) => ({ name: m.name, dueDate: m.dueDate }));
}

/**
 * Jalons à risque pour PLUSIEURS projets, en requêtes groupées (pas de N+1).
 * Utilisé par le briefing.
 */
export async function atRiskByProjects(
  projectIds: string[],
): Promise<Map<string, { name: string }[]>> {
  const result = new Map<string, { name: string }[]>();
  if (projectIds.length === 0) return result;

  const [allMs, allTs, allAssign] = await Promise.all([
    milestones().find({ where: { projectId: In(projectIds) } }),
    tasks().find({ where: { projectId: In(projectIds) } }),
    AppDataSource.getRepository(Assignment).find({ where: { projectId: In(projectIds) } }),
  ]);

  const group = <T extends { projectId: string }>(rows: T[]): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const list = m.get(r.projectId) ?? [];
      list.push(r);
      m.set(r.projectId, list);
    }
    return m;
  };
  const msByP = group(allMs);
  const tsByP = group(allTs);
  const velByP = new Map<string, number>();
  for (const a of allAssign) velByP.set(a.projectId, (velByP.get(a.projectId) ?? 0) + a.velocity);

  const now = new Date();
  for (const pid of projectIds) {
    const ms = (msByP.get(pid) ?? []).map(mToDTO);
    if (ms.length === 0) continue;
    const plan = computePlan({
      milestones: ms,
      tasks: (tsByP.get(pid) ?? []).map(tToDTO),
      velocity: velByP.get(pid) ?? 0,
      now,
    });
    const atRisk = plan.milestones.filter((m) => m.atRisk).map((m) => ({ name: m.name }));
    if (atRisk.length > 0) result.set(pid, atRisk);
  }
  return result;
}
