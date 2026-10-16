import type {
  Block,
  BlockLink,
  BlockState,
  BlockWithState,
  PortfolioBlocker,
  PortfolioMap,
} from "@projectmaster/shared";

/** Fenêtres de calcul. */
const ORANGE_HORIZON_DAYS = 14; // date cible dans les N prochains jours
const STALE_DAYS = 7; // activité absente ou plus vieille que N jours

const RANK: Record<BlockState, number> = { vert: 0, orange: 1, rouge: 2 };
function worst(a: BlockState, b: BlockState): BlockState {
  return RANK[a] >= RANK[b] ? a : b;
}

function startOfDayUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Parse une date cible "YYYY-MM-DD" en timestamp UTC minuit (ou null). */
function parseTargetDate(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatFr(s: string | null): string {
  const t = parseTargetDate(s);
  if (t === null) return "—";
  const d = new Date(t);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/** État de base d'une brique (sans propagation). */
export function baseState(block: Block, now: Date): BlockState {
  const target = parseTargetDate(block.targetDate);
  if (target === null) return "vert";
  const today = startOfDayUTC(now);
  if (target < today) return "rouge";
  if (target <= today + ORANGE_HORIZON_DAYS * 86_400_000) {
    const la = block.lastActivityAt ? new Date(block.lastActivityAt).getTime() : null;
    const staleBefore = now.getTime() - STALE_DAYS * 86_400_000;
    if (la === null || la < staleBefore) return "orange";
  }
  return "vert";
}

/**
 * Calcule la carte du portefeuille : état propagé de chaque brique le long du
 * graphe DEPENDS_ON, nombre de briques bloquées, bloqueurs, cycles et phrase
 * de synthèse. Fonction PURE (aucun effet de bord), robuste aux cycles.
 */
export function computePortfolioMap(
  blocks: Block[],
  links: BlockLink[],
  now: Date = new Date(),
): PortfolioMap {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const deps = new Map<string, string[]>(); // b -> dépendances (toId)
  const dependents = new Map<string, string[]>(); // b -> dépendants (fromId)
  for (const b of blocks) {
    deps.set(b.id, []);
    dependents.set(b.id, []);
  }
  for (const l of links) {
    if (l.type !== "depends_on") continue;
    // On ignore les liens pointant vers des briques inconnues.
    if (!byId.has(l.fromId) || !byId.has(l.toId)) continue;
    deps.get(l.fromId)!.push(l.toId);
    dependents.get(l.toId)!.push(l.fromId);
  }

  const base = new Map<string, BlockState>();
  for (const b of blocks) base.set(b.id, baseState(b, now));

  // ── État propagé (DFS mémoïsé, arêtes de cycle ignorées) ──────────────────
  const state = new Map<string, BlockState>();
  const visiting = new Set<string>();
  const warningsSet = new Set<string>();

  function resolve(id: string): BlockState {
    const cached = state.get(id);
    if (cached) return cached;
    visiting.add(id);
    let s = base.get(id)!;
    for (const dep of deps.get(id) ?? []) {
      if (visiting.has(dep)) {
        // Arête retour → cycle : on l'ignore pour la propagation.
        const a = byId.get(id)?.name ?? id;
        const d = byId.get(dep)?.name ?? dep;
        warningsSet.add(`Cycle de dépendances détecté : ${d} ↔ ${a} (lien ignoré)`);
        continue;
      }
      s = worst(s, resolve(dep));
    }
    visiting.delete(id);
    state.set(id, s);
    return s;
  }
  for (const b of blocks) resolve(b.id);

  // ── bloque(X) : dépendants transitifs rouges (X rouge par sa propre date) ──
  function countBlockedDownstream(id: string): string[] {
    const seen = new Set<string>();
    const stack = [...(dependents.get(id) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const next of dependents.get(cur) ?? []) {
        if (!seen.has(next)) stack.push(next);
      }
    }
    return [...seen].filter((y) => state.get(y) === "rouge");
  }

  const bloqueById = new Map<string, number>();
  const blockedUnion = new Set<string>();
  const blockers: PortfolioBlocker[] = [];
  for (const b of blocks) {
    const downstreamReds = base.get(b.id) === "rouge" ? countBlockedDownstream(b.id) : [];
    bloqueById.set(b.id, downstreamReds.length);
    if (base.get(b.id) === "rouge") {
      blockers.push({ id: b.id, name: b.name, bloque: downstreamReds.length });
      for (const y of downstreamReds) blockedUnion.add(y);
    }
  }
  blockers.sort((a, b) => b.bloque - a.bloque || a.name.localeCompare(b.name));

  // ── Raison lisible par brique ─────────────────────────────────────────────
  function reasonFor(b: Block): string {
    const s = state.get(b.id)!;
    const bs = base.get(b.id)!;
    if (s === "vert") return "Dans les délais";
    if (bs === s) {
      // Cause propre.
      if (s === "rouge") return `Échéance dépassée (${formatFr(b.targetDate)})`;
      return "Échéance proche, activité en attente";
    }
    // État hérité d'une dépendance : on nomme une dépendance du même état.
    const culprit = (deps.get(b.id) ?? [])
      .map((d) => byId.get(d))
      .find((d) => d && state.get(d.id) === s);
    const colour = s === "rouge" ? "rouge" : "orange";
    return culprit ? `Dépend de ${culprit.name}, en ${colour}` : `En ${colour}`;
  }

  const enriched: BlockWithState[] = blocks.map((b) => ({
    ...b,
    state: state.get(b.id)!,
    reason: reasonFor(b),
    bloque: bloqueById.get(b.id) ?? 0,
  }));

  // ── Phrase de synthèse ────────────────────────────────────────────────────
  const anyRed = enriched.some((b) => b.state === "rouge");
  let headline: string;
  if (!anyRed) {
    headline = "Tout le portefeuille est dans les délais.";
  } else {
    const rootN = blockers.length;
    const m = blockedUnion.size;
    const names = blockers.slice(0, 2).map((x) => x.name).join(", ");
    const briqueWord = rootN > 1 ? "briques rouges" : "brique rouge";
    if (m === 0) {
      headline = `${rootN} ${briqueWord} : ${names}.`;
    } else {
      const verb = rootN > 1 ? "bloquent" : "bloque";
      const autres = m > 1 ? `${m} autres` : "1 autre";
      headline = `${rootN} ${briqueWord} ${verb} ${autres} : ${names}.`;
    }
  }

  return {
    blocks: enriched,
    links: links.filter((l) => l.type === "depends_on"),
    blockers,
    warnings: [...warningsSet],
    headline,
  };
}
