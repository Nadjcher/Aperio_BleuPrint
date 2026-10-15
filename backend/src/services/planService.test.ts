import { describe, expect, it } from "vitest";
import type { Milestone, Task } from "@projectmaster/shared";
import { computeDelivery, computePlan, criticalPath, type PlanInput } from "./planService.js";

const now = new Date("2026-10-15T00:00:00Z");

function m(id: string, over: Partial<Milestone> = {}): Milestone {
  return {
    id,
    projectId: "p",
    name: id,
    status: "pending",
    orderIndex: 0,
    createdAt: now.toISOString(),
    ...over,
  };
}
function t(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    projectId: "p",
    title: "t",
    effortPoints: 1,
    status: "todo",
    createdAt: now.toISOString(),
    ...over,
  };
}

describe("computeDelivery", () => {
  it("estime les semaines depuis effort restant / vélocité", () => {
    const d = computeDelivery({
      milestones: [],
      tasks: [t({ effortPoints: 10 }), t({ effortPoints: 10 }), t({ effortPoints: 5, status: "done" })],
      velocity: 10,
      now,
    });
    expect(d.remainingEffort).toBe(20);
    expect(d.weeks).toBe(2);
    expect(new Date(d.optimistic!).getTime()).toBeLessThan(new Date(d.expected!).getTime());
    expect(new Date(d.pessimistic!).getTime()).toBeGreaterThan(new Date(d.expected!).getTime());
  });

  it("pas de date sans vélocité", () => {
    const d = computeDelivery({ milestones: [], tasks: [t({ effortPoints: 5 })], velocity: 0, now });
    expect(d.weeks).toBeNull();
    expect(d.note).toContain("vélocité");
  });

  it("tout terminé → 0 semaine", () => {
    const d = computeDelivery({ milestones: [], tasks: [t({ status: "done" })], velocity: 5, now });
    expect(d.weeks).toBe(0);
  });

  it("l'incertitude se resserre avec l'historique terminé", () => {
    const base = [t({ effortPoints: 10 })];
    const few = computeDelivery({ milestones: [], tasks: base, velocity: 10, now });
    const many = computeDelivery({
      milestones: [],
      tasks: [...base, ...Array.from({ length: 8 }, () => t({ status: "done" }))],
      velocity: 10,
      now,
    });
    const span = (d: ReturnType<typeof computeDelivery>) =>
      new Date(d.pessimistic!).getTime() - new Date(d.optimistic!).getTime();
    expect(span(many)).toBeLessThan(span(few));
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });
});

describe("criticalPath", () => {
  it("retourne la chaîne de dépendances au plus gros effort", () => {
    // a -> b -> c (chaîne) ; d isolé plus léger
    const ms = [m("a"), m("b", { dependsOnId: "a" }), m("c", { dependsOnId: "b" }), m("d")];
    const effort = new Map([
      ["a", 3],
      ["b", 2],
      ["c", 4],
      ["d", 5],
    ]);
    expect(criticalPath(ms, effort)).toEqual(["a", "b", "c"]); // 9 > 5
  });
});

describe("computePlan", () => {
  it("marque un jalon à risque quand la fin projetée dépasse l'échéance", () => {
    const input: PlanInput = {
      milestones: [m("m1", { dueDate: "2026-10-20", orderIndex: 0 })],
      tasks: [t({ milestoneId: "m1", effortPoints: 20 })], // 20/10 = 2 sem → ~29/10 > 20/10
      velocity: 10,
      now,
    };
    const plan = computePlan(input);
    expect(plan.milestones[0].atRisk).toBe(true);
    expect(plan.milestones[0].projectedEnd).toBeDefined();
  });

  it("jalon dans les temps n'est pas à risque", () => {
    const input: PlanInput = {
      milestones: [m("m1", { dueDate: "2026-12-31", orderIndex: 0 })],
      tasks: [t({ milestoneId: "m1", effortPoints: 10 })],
      velocity: 10,
      now,
    };
    expect(computePlan(input).milestones[0].atRisk).toBe(false);
  });
});
