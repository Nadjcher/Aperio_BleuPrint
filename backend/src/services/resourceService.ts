import type {
  NetImpact,
  ProjectResourcing,
  ResourceMoveAnalysis,
} from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Member } from "../entities/Member.js";
import { Assignment } from "../entities/Assignment.js";
import { AppError } from "../middleware/errorHandler.js";

const members = () => AppDataSource.getRepository(Member);
const assignments = () => AppDataSource.getRepository(Assignment);

// ─── Entrée/sortie de l'analyse de gravité (pures, testables) ────────────────
export interface MoveInput {
  memberName: string;
  memberSkills: string[];
  memberVelocityOnFrom: number;
  from: {
    projectId: string;
    projectName: string;
    totalVelocity: number;
    otherMembersSkills: string[];
  };
  to?: { projectId: string; projectName: string; totalVelocity: number };
  onboardingWeeks?: number;
}

/**
 * Analyse de « gravité » d'un déplacement de ressource (fonction PURE).
 * Modèle heuristique explicable : perte de vélocité, allongement de durée,
 * perte d'expertise, et impact net cross-projet.
 */
export function analyzeResourceMove(input: MoveInput): ResourceMoveAnalysis {
  const onboardingWeeks = input.onboardingWeeks ?? 1;
  const vBefore = input.from.totalVelocity;
  const contrib = Math.min(input.memberVelocityOnFrom, vBefore);
  const vAfter = Math.max(0, vBefore - contrib);
  const lossPct = Math.round((contrib / Math.max(vBefore, 1)) * 100);

  const p = Math.min(0.99, lossPct / 100);
  const durationIncreasePct = Math.round((1 / (1 - p) - 1) * 100);

  const otherSkills = new Set(input.from.otherMembersSkills.map((s) => s.toLowerCase()));
  const skillsGap = input.memberSkills.filter((s) => !otherSkills.has(s.toLowerCase()));

  let to: ResourceMoveAnalysis["to"];
  let gainPct = 0;
  if (input.to) {
    const toBefore = input.to.totalVelocity;
    gainPct = Math.round((contrib / Math.max(toBefore, 1)) * 100);
    to = {
      projectId: input.to.projectId,
      projectName: input.to.projectName,
      velocityBefore: toBefore,
      velocityAfter: toBefore + contrib,
      velocityGainPct: gainPct,
      effectiveAfterWeeks: onboardingWeeks,
    };
  }

  const gravityScore = Math.min(100, lossPct + skillsGap.length * 10);

  let netImpact: NetImpact;
  if (!input.to) {
    netImpact = lossPct > 30 ? "negative" : "neutral";
  } else if (gainPct > lossPct + 10) {
    netImpact = "positive";
  } else if (lossPct >= gainPct || lossPct > 40) {
    netImpact = "negative";
  } else {
    netImpact = "neutral";
  }

  const gapNote = skillsGap.length
    ? ` Perte d'expertise : ${skillsGap.join(", ")}.`
    : "";
  let recommendation: string;
  if (gravityScore > 50) {
    recommendation = `À éviter : impact fort sur ${input.from.projectName} (−${lossPct}% de vélocité, +${durationIncreasePct}% de durée).${gapNote}`;
  } else if (gravityScore >= 25) {
    recommendation = `Risqué : envisager un partage 50/50 ou un autre membre.${gapNote}`;
  } else {
    recommendation = `Déplacement acceptable (impact limité sur ${input.from.projectName}).${gapNote}`;
  }

  const confidence = vBefore > 0 && contrib > 0 ? 0.6 : 0.3;

  return {
    member: input.memberName,
    from: {
      projectId: input.from.projectId,
      projectName: input.from.projectName,
      velocityBefore: vBefore,
      velocityAfter: vAfter,
      velocityLossPct: lossPct,
      durationIncreasePct,
      skillsGap,
    },
    to,
    gravityScore,
    netImpact,
    recommendation,
    confidence,
  };
}

// ─── Accès données ───────────────────────────────────────────────────────────

export async function listMembers(ownerId: string): Promise<Member[]> {
  return members().find({ where: { ownerId }, order: { createdAt: "DESC" } });
}

export async function createMember(
  ownerId: string,
  data: { name: string; skills: string[]; weeklyCapacity?: number },
): Promise<Member> {
  return members().save(
    members().create({
      ownerId,
      name: data.name,
      skills: data.skills,
      weeklyCapacity: data.weeklyCapacity ?? 35,
    }),
  );
}

export async function deleteMember(ownerId: string, memberId: string): Promise<void> {
  const m = await members().findOne({ where: { id: memberId, ownerId } });
  if (!m) throw new AppError(404, "not_found", "Membre introuvable");
  await assignments().delete({ memberId });
  await members().delete({ id: memberId });
}

/** Vérifie qu'un membre appartient au propriétaire. */
async function ownedMember(ownerId: string, memberId: string): Promise<Member> {
  const m = await members().findOne({ where: { id: memberId, ownerId } });
  if (!m) throw new AppError(404, "not_found", "Membre introuvable");
  return m;
}

export async function upsertAssignment(
  ownerId: string,
  projectId: string,
  data: { memberId: string; allocationPct: number; velocity: number },
): Promise<Assignment> {
  await ownedMember(ownerId, data.memberId);
  const existing = await assignments().findOne({
    where: { memberId: data.memberId, projectId },
  });
  const row = existing ?? assignments().create({ memberId: data.memberId, projectId });
  row.allocationPct = data.allocationPct;
  row.velocity = data.velocity;
  return assignments().save(row);
}

export async function removeAssignment(
  ownerId: string,
  projectId: string,
  memberId: string,
): Promise<void> {
  await ownedMember(ownerId, memberId);
  await assignments().delete({ memberId, projectId });
}

/** Composition ressources d'un projet (membres + vélocité totale). */
export async function projectResourcing(projectId: string): Promise<ProjectResourcing> {
  const rows = await assignments().find({ where: { projectId } });
  const byId = new Map(
    (await members().findByIds(rows.map((r) => r.memberId))).map((m) => [m.id, m]),
  );
  const list = rows.map((r) => {
    const m = byId.get(r.memberId);
    return {
      memberId: r.memberId,
      name: m?.name ?? "—",
      skills: m?.skills ?? [],
      allocationPct: r.allocationPct,
      velocity: r.velocity,
    };
  });
  return {
    projectId,
    totalVelocity: list.reduce((s, m) => s + m.velocity, 0),
    members: list,
  };
}

/** Charge les données et exécute l'analyse de gravité d'un déplacement. */
export async function simulateMove(
  ownerId: string,
  fromProjectId: string,
  memberId: string,
  toProjectId?: string,
  fromProjectName = "projet source",
  toProjectName = "projet cible",
): Promise<ResourceMoveAnalysis> {
  const member = await ownedMember(ownerId, memberId);
  const fromAssign = await assignments().findOne({
    where: { memberId, projectId: fromProjectId },
  });
  if (!fromAssign) {
    throw new AppError(400, "not_assigned", "Ce membre n'est pas affecté au projet source");
  }
  const fromRes = await projectResourcing(fromProjectId);
  const otherSkills = fromRes.members
    .filter((m) => m.memberId !== memberId)
    .flatMap((m) => m.skills);

  const input: MoveInput = {
    memberName: member.name,
    memberSkills: member.skills,
    memberVelocityOnFrom: fromAssign.velocity,
    from: {
      projectId: fromProjectId,
      projectName: fromProjectName,
      totalVelocity: fromRes.totalVelocity,
      otherMembersSkills: otherSkills,
    },
  };
  if (toProjectId) {
    const toRes = await projectResourcing(toProjectId);
    input.to = { projectId: toProjectId, projectName: toProjectName, totalVelocity: toRes.totalVelocity };
  }
  return analyzeResourceMove(input);
}
