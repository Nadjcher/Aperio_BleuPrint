import { In } from "typeorm";
import type {
  Block as BlockDTO,
  BlockLink as BlockLinkDTO,
  BlockSource,
  PortfolioMap,
} from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Block } from "../entities/Block.js";
import { BlockLink } from "../entities/BlockLink.js";
import { Project } from "../entities/Project.js";
import { Member } from "../entities/Member.js";
import { AppError } from "../errors/index.js";
import { getOwnedProject, listProjects } from "./projectService.js";
import { resolveContext } from "./connectorConfigService.js";
import { getConnector } from "../connectors/index.js";

const blocks = () => AppDataSource.getRepository(Block);
const links = () => AppDataSource.getRepository(BlockLink);

function toBlockDTO(b: Block): BlockDTO {
  return {
    id: b.id,
    projectId: b.projectId,
    name: b.name,
    type: b.type,
    ownerId: b.ownerId,
    targetDate: b.targetDate,
    lastActivityAt: b.lastActivityAt ? b.lastActivityAt.toISOString() : null,
    source: b.source,
    sourceRef: b.sourceRef,
  };
}
function toLinkDTO(l: BlockLink): BlockLinkDTO {
  return { id: l.id, fromId: l.fromId, toId: l.toId, type: l.type };
}

/** IDs des projets appartenant au compte (optionnellement filtré sur un projet). */
async function scopedProjectIds(ownerId: string, projectId?: string): Promise<string[]> {
  if (projectId) {
    await getOwnedProject(ownerId, projectId); // vérifie la propriété (404 sinon)
    return [projectId];
  }
  const projects = await listProjects(ownerId);
  return projects.map((p) => p.id);
}

// ─── Carte ────────────────────────────────────────────────────────────────

/** Construit la carte du portefeuille (états calculés côté serveur). */
export async function getMap(
  ownerId: string,
  opts: { projectId?: string; onlyAtRisk?: boolean } = {},
): Promise<PortfolioMap> {
  // Import paresseux : le calcul est pur et sans dépendance DB.
  const { computePortfolioMap } = await import("./portfolioState.js");

  const projectIds = await scopedProjectIds(ownerId, opts.projectId);
  if (projectIds.length === 0) {
    return { blocks: [], links: [], blockers: [], warnings: [], headline: "Aucune brique dans le portefeuille." };
  }

  const blockRows = await blocks().find({ where: { projectId: In(projectIds) } });
  const ids = blockRows.map((b) => b.id);
  const linkRows =
    ids.length > 0 ? await links().find({ where: { fromId: In(ids), toId: In(ids) } }) : [];

  const map = computePortfolioMap(blockRows.map(toBlockDTO), linkRows.map(toLinkDTO));

  // Enrichissement d'affichage (noms projet/responsable).
  const [projects, members] = await Promise.all([
    AppDataSource.getRepository(Project).find({ where: { id: In(projectIds) } }),
    AppDataSource.getRepository(Member).find({ where: { ownerId } }),
  ]);
  const projName = new Map(projects.map((p) => [p.id, p.name]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  for (const b of map.blocks) {
    b.projectName = projName.get(b.projectId);
    b.ownerName = b.ownerId ? memberName.get(b.ownerId) ?? null : null;
  }

  if (opts.onlyAtRisk) {
    const kept = new Set(map.blocks.filter((b) => b.state !== "vert").map((b) => b.id));
    map.blocks = map.blocks.filter((b) => kept.has(b.id));
    map.links = map.links.filter((l) => kept.has(l.fromId) && kept.has(l.toId));
  }
  return map;
}

// ─── Briques (CRUD manuel) ──────────────────────────────────────────────────

export async function createBlock(
  ownerId: string,
  dto: { projectId: string; name: string; type: string; ownerId?: string | null; targetDate?: string | null },
): Promise<BlockDTO> {
  await getOwnedProject(ownerId, dto.projectId);
  const saved = await blocks().save(
    blocks().create({
      projectId: dto.projectId,
      name: dto.name,
      type: dto.type,
      ownerId: dto.ownerId ?? null,
      targetDate: dto.targetDate ?? null,
      source: "manuel",
    }),
  );
  return toBlockDTO(saved);
}

/** Charge une brique en s'assurant qu'elle appartient à un projet du compte. */
async function getOwnedBlock(ownerId: string, id: string): Promise<Block> {
  const b = await blocks().findOne({ where: { id } });
  if (!b) throw new AppError(404, "not_found", "Brique introuvable");
  await getOwnedProject(ownerId, b.projectId); // 404 si le projet n'est pas au compte
  return b;
}

export async function deleteBlock(ownerId: string, id: string): Promise<void> {
  const b = await getOwnedBlock(ownerId, id);
  // Supprime aussi les liens qui la référencent.
  await links().delete([{ fromId: b.id }, { toId: b.id }]);
  await blocks().delete({ id: b.id });
}

// ─── Liens DEPENDS_ON (avec anti-cycle) ─────────────────────────────────────

/** `to` dépend-il (transitivement) de `from` ? → ajouter from→to créerait un cycle. */
async function wouldCreateCycle(fromId: string, toId: string): Promise<boolean> {
  if (fromId === toId) return true;
  const all = await links().find({ where: { type: "depends_on" } });
  const deps = new Map<string, string[]>();
  for (const l of all) {
    if (!deps.has(l.fromId)) deps.set(l.fromId, []);
    deps.get(l.fromId)!.push(l.toId);
  }
  // Depuis `to`, peut-on atteindre `from` en suivant depends_on ?
  const seen = new Set<string>();
  const stack = [toId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === fromId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const d of deps.get(cur) ?? []) stack.push(d);
  }
  return false;
}

export async function createLink(
  ownerId: string,
  dto: { fromId: string; toId: string },
): Promise<BlockLinkDTO> {
  if (dto.fromId === dto.toId) {
    throw new AppError(400, "invalid_link", "Une brique ne peut pas dépendre d'elle-même");
  }
  // Les deux briques doivent appartenir au compte.
  await getOwnedBlock(ownerId, dto.fromId);
  await getOwnedBlock(ownerId, dto.toId);

  if (await wouldCreateCycle(dto.fromId, dto.toId)) {
    throw new AppError(409, "cycle", "Ce lien créerait un cycle de dépendances");
  }

  const existing = await links().findOne({
    where: { fromId: dto.fromId, toId: dto.toId, type: "depends_on" },
  });
  if (existing) return toLinkDTO(existing);

  const saved = await links().save(
    links().create({ fromId: dto.fromId, toId: dto.toId, type: "depends_on" }),
  );
  return toLinkDTO(saved);
}

export async function deleteLink(ownerId: string, id: string): Promise<void> {
  const l = await links().findOne({ where: { id } });
  if (!l) throw new AppError(404, "not_found", "Lien introuvable");
  // Vérifie la propriété via l'une des briques.
  await getOwnedBlock(ownerId, l.fromId);
  await links().delete({ id });
}

// ─── Import depuis les connecteurs existants (Jira / GitHub) ─────────────────

/**
 * Importe des briques depuis le connecteur configuré du projet (Jira/GitHub),
 * en RÉUTILISANT le service de synchro (fetchSignals). Upsert idempotent par
 * (projectId, source, sourceRef).
 */
export async function importFromConnector(
  ownerId: string,
  projectId: string,
): Promise<{ imported: number; updated: number }> {
  await getOwnedProject(ownerId, projectId);
  const configured = await resolveContext(projectId);
  if (!configured) {
    throw new AppError(400, "no_connector", "Aucun connecteur configuré pour ce projet");
  }
  const src = configured.provider;
  if (src !== "jira" && src !== "github") {
    throw new AppError(400, "unsupported_source", "Import de briques : seuls Jira et GitHub sont pris en charge");
  }
  const source: BlockSource = src;

  const signals = await getConnector(configured.provider).fetchSignals(configured.ctx);
  const candidates = signals
    .filter((s) => s.type === "issue" || s.type === "pull_request")
    .slice(0, 100);

  let imported = 0;
  let updated = 0;
  for (const s of candidates) {
    const payload = (s.payload ?? {}) as { key?: string; title?: string };
    const sourceRef = payload.key ? String(payload.key) : null;
    if (!sourceRef) continue;
    const name = (payload.title ?? sourceRef).slice(0, 200);
    const existing = await blocks().findOne({ where: { projectId, source, sourceRef } });
    if (existing) {
      existing.name = name;
      existing.lastActivityAt = s.occurredAt;
      await blocks().save(existing);
      updated++;
    } else {
      await blocks().save(
        blocks().create({
          projectId,
          name,
          type: s.type === "pull_request" ? "PR" : "issue",
          ownerId: null,
          targetDate: null,
          lastActivityAt: s.occurredAt,
          source,
          sourceRef,
        }),
      );
      imported++;
    }
  }
  return { imported, updated };
}
