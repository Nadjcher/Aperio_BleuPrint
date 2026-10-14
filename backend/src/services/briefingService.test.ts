import { describe, expect, it } from "vitest";
import { composeBriefing, healthFromCounts, type ProjectBrief } from "./briefingService.js";

const now = new Date("2026-10-14T08:00:00Z");

describe("composeBriefing", () => {
  it("priorise critique > important > fyi > win", () => {
    const projects: ProjectBrief[] = [
      {
        projectId: "p1",
        projectName: "Alpha",
        criticalAnomalies: ["Chute d'activité"],
        warningCount: 2,
        openCount: 3,
        pendingDecisions: [{ id: "d1", title: "Résoudre", rationale: "car…" }],
      },
      {
        projectId: "p2",
        projectName: "Beta",
        criticalAnomalies: [],
        warningCount: 0,
        openCount: 0,
        pendingDecisions: [],
      },
    ];
    const b = composeBriefing(projects, now);
    expect(b.items.map((i) => i.priority)).toEqual(["critical", "important", "fyi", "win"]);
    expect(b.counts).toEqual({ critical: 1, important: 1, fyi: 1, win: 1 });
    expect(b.greeting).toContain("critique");
  });

  it("salutation calme quand rien d'urgent", () => {
    const b = composeBriefing(
      [{ projectId: "p", projectName: "X", criticalAnomalies: [], warningCount: 0, openCount: 0, pendingDecisions: [] }],
      now,
    );
    expect(b.greeting).toContain("sous contrôle");
    expect(b.items[0].priority).toBe("win");
  });

  it("invite à relier un projet quand aucun", () => {
    const b = composeBriefing([], now);
    expect(b.items).toHaveLength(0);
    expect(b.greeting).toContain("Reliez un projet");
  });

  it("chaque item porte une action vers son projet", () => {
    const b = composeBriefing(
      [{ projectId: "pid", projectName: "P", criticalAnomalies: ["x"], warningCount: 0, openCount: 1, pendingDecisions: [] }],
      now,
    );
    expect(b.items[0].actions[0].to).toBe("/projects/pid");
  });

  it("expose santé + activité dans la sortie", () => {
    const b = composeBriefing([], now, 42);
    expect(b.activity7d).toBe(42);
    expect(b.health).toEqual({ score: 100, risk: "faible" });
  });
});

describe("healthFromCounts", () => {
  it("100 et risque faible quand rien", () => {
    expect(healthFromCounts({ critical: 0, important: 0, fyi: 0, win: 3 })).toEqual({
      score: 100,
      risk: "faible",
    });
  });

  it("risque élevé dès une criticité, score pénalisé", () => {
    const h = healthFromCounts({ critical: 1, important: 2, fyi: 0, win: 0 });
    expect(h.risk).toBe("élevé");
    expect(h.score).toBe(100 - 25 - 16); // 59
  });

  it("risque moyen sans critique mais avec décisions à approuver", () => {
    expect(healthFromCounts({ critical: 0, important: 1, fyi: 0, win: 0 }).risk).toBe("moyen");
  });

  it("borne le score à 0", () => {
    expect(healthFromCounts({ critical: 10, important: 0, fyi: 0, win: 0 }).score).toBe(0);
  });
});
