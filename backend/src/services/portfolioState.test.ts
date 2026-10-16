import { describe, expect, it } from "vitest";
import type { Block, BlockLink } from "@projectmaster/shared";
import { baseState, computePortfolioMap } from "./portfolioState.js";

const NOW = new Date("2026-10-16T12:00:00Z");

function block(id: string, over: Partial<Block> = {}): Block {
  return {
    id,
    projectId: "p1",
    name: id.toUpperCase(),
    type: "API",
    ownerId: null,
    targetDate: null,
    lastActivityAt: null,
    source: "manuel",
    sourceRef: null,
    ...over,
  };
}
function dep(fromId: string, toId: string): BlockLink {
  return { id: `${fromId}-${toId}`, fromId, toId, type: "depends_on" };
}

const PAST = "2026-10-01"; // dépassée
const SOON = "2026-10-20"; // dans 14 j
const FAR = "2026-12-31"; // lointaine

describe("baseState", () => {
  it("rouge si échéance dépassée", () => {
    expect(baseState(block("a", { targetDate: PAST }), NOW)).toBe("rouge");
  });
  it("orange si échéance proche et activité absente/ancienne", () => {
    expect(baseState(block("a", { targetDate: SOON }), NOW)).toBe("orange");
    expect(
      baseState(block("a", { targetDate: SOON, lastActivityAt: "2026-10-15T00:00:00Z" }), NOW),
    ).toBe("vert"); // activité récente (< 7 j)
  });
  it("vert si date absente ou lointaine", () => {
    expect(baseState(block("a", { targetDate: null }), NOW)).toBe("vert");
    expect(baseState(block("a", { targetDate: FAR }), NOW)).toBe("vert");
  });
});

describe("computePortfolioMap", () => {
  it("brique sans dépendance : état = état de base", () => {
    const map = computePortfolioMap([block("a", { targetDate: PAST })], [], NOW);
    expect(map.blocks[0].state).toBe("rouge");
    expect(map.blocks[0].bloque).toBe(0);
    expect(map.headline).toBe("1 brique rouge : A.");
  });

  it("date absente → vert et portefeuille dans les délais", () => {
    const map = computePortfolioMap([block("a")], [], NOW);
    expect(map.blocks[0].state).toBe("vert");
    expect(map.headline).toBe("Tout le portefeuille est dans les délais.");
  });

  it("propagation simple : une dépendance rouge rend le dépendant rouge", () => {
    const a = block("a", { targetDate: FAR }); // dépendant, base vert
    const b = block("b", { targetDate: PAST }); // dépendance, rouge
    const map = computePortfolioMap([a, b], [dep("a", "b")], NOW);
    const byId = Object.fromEntries(map.blocks.map((x) => [x.id, x]));
    expect(byId.b.state).toBe("rouge");
    expect(byId.a.state).toBe("rouge");
    expect(byId.a.reason).toMatch(/Dépend de B, en rouge/);
    expect(byId.b.bloque).toBe(1);
    expect(map.blockers[0]).toMatchObject({ id: "b", bloque: 1 });
    expect(map.headline).toBe("1 brique rouge bloque 1 autre : B.");
  });

  it("propagation en chaîne : la rouge racine bloque toute la chaîne aval", () => {
    // C dépend de B, B dépend de A ; A rouge.
    const a = block("a", { targetDate: PAST });
    const b = block("b", { targetDate: FAR });
    const c = block("c", { targetDate: FAR });
    const map = computePortfolioMap([a, b, c], [dep("b", "a"), dep("c", "b")], NOW);
    const byId = Object.fromEntries(map.blocks.map((x) => [x.id, x]));
    expect([byId.a.state, byId.b.state, byId.c.state]).toEqual(["rouge", "rouge", "rouge"]);
    expect(byId.a.bloque).toBe(2);
    expect(map.headline).toBe("1 brique rouge bloque 2 autres : A.");
  });

  it("propagation orange", () => {
    const a = block("a", { targetDate: FAR });
    const b = block("b", { targetDate: SOON }); // orange (pas d'activité)
    const map = computePortfolioMap([a, b], [dep("a", "b")], NOW);
    const byId = Object.fromEntries(map.blocks.map((x) => [x.id, x]));
    expect(byId.b.state).toBe("orange");
    expect(byId.a.state).toBe("orange");
    expect(byId.a.reason).toMatch(/Dépend de B, en orange/);
    expect(map.headline).toBe("Tout le portefeuille est dans les délais."); // aucun rouge
  });

  it("cycle de dépendances : pas de plantage, avertissement remonté", () => {
    const a = block("a");
    const b = block("b");
    // A ↔ B
    const map = computePortfolioMap([a, b], [dep("a", "b"), dep("b", "a")], NOW);
    expect(map.blocks.every((x) => x.state === "vert")).toBe(true);
    expect(map.warnings.length).toBeGreaterThan(0);
    expect(map.warnings[0]).toMatch(/Cycle/);
  });

  it("cycle contenant une brique rouge : propage sans boucler", () => {
    const a = block("a", { targetDate: PAST }); // rouge
    const b = block("b");
    const map = computePortfolioMap([a, b], [dep("a", "b"), dep("b", "a")], NOW);
    // Pas d'exception ; a est rouge (sa propre date), b hérite via un sens.
    const byId = Object.fromEntries(map.blocks.map((x) => [x.id, x]));
    expect(byId.a.state).toBe("rouge");
    expect(map.warnings.length).toBeGreaterThan(0);
  });
});
