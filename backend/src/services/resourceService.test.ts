import { describe, expect, it } from "vitest";
import { analyzeResourceMove, type MoveInput } from "./resourceService.js";

function base(partial: Partial<MoveInput> = {}): MoveInput {
  return {
    memberName: "Alice",
    memberSkills: ["backend", "sql"],
    memberVelocityOnFrom: 5,
    from: {
      projectId: "p-from",
      projectName: "Projet A",
      totalVelocity: 20,
      otherMembersSkills: ["backend", "sql", "design"],
    },
    ...partial,
  };
}

describe("analyzeResourceMove — gravité", () => {
  it("impact limité quand la contribution est faible et l'expertise couverte", () => {
    const r = analyzeResourceMove(base());
    expect(r.from.velocityLossPct).toBe(25);
    expect(r.from.skillsGap).toEqual([]);
    expect(r.gravityScore).toBe(25); // 25 + 0
    expect(r.recommendation).toContain("Risqué");
  });

  it("gravité forte quand le membre pèse une grosse part de la vélocité", () => {
    const r = analyzeResourceMove(
      base({ memberVelocityOnFrom: 16, from: { ...base().from, totalVelocity: 20 } }),
    );
    expect(r.from.velocityLossPct).toBe(80);
    expect(r.gravityScore).toBe(80);
    expect(r.recommendation).toContain("À éviter");
    expect(r.from.durationIncreasePct).toBeGreaterThan(0);
  });

  it("détecte une perte d'expertise non couverte et l'ajoute à la gravité", () => {
    const r = analyzeResourceMove(
      base({
        memberSkills: ["backend", "ml", "kubernetes"],
        from: { ...base().from, otherMembersSkills: ["backend"] },
      }),
    );
    expect(r.from.skillsGap).toEqual(["ml", "kubernetes"]);
    // lossPct 25 + 2 compétences * 10 = 45
    expect(r.gravityScore).toBe(45);
    expect(r.recommendation).toContain("ml, kubernetes");
  });

  it("déplacement cross-projet : impact net positif quand le gain dépasse la perte", () => {
    const r = analyzeResourceMove(
      base({
        memberVelocityOnFrom: 3,
        from: { ...base().from, totalVelocity: 30 },
        to: { projectId: "p-to", projectName: "Projet B", totalVelocity: 5 },
      }),
    );
    expect(r.to).toBeDefined();
    expect(r.to!.velocityGainPct).toBeGreaterThan(r.from.velocityLossPct + 10);
    expect(r.netImpact).toBe("positive");
    expect(r.to!.effectiveAfterWeeks).toBe(1);
  });

  it("déplacement cross-projet : impact net négatif quand la perte domine", () => {
    const r = analyzeResourceMove(
      base({
        memberVelocityOnFrom: 15,
        from: { ...base().from, totalVelocity: 20 },
        to: { projectId: "p-to", projectName: "Projet B", totalVelocity: 100 },
      }),
    );
    expect(r.netImpact).toBe("negative");
  });

  it("confiance basse sans donnée de vélocité exploitable", () => {
    const r = analyzeResourceMove(
      base({ memberVelocityOnFrom: 0, from: { ...base().from, totalVelocity: 0 } }),
    );
    expect(r.confidence).toBe(0.3);
  });

  it("borne la gravité à 100", () => {
    const r = analyzeResourceMove(
      base({
        memberVelocityOnFrom: 20,
        memberSkills: ["a", "b", "c", "d", "e"],
        from: { ...base().from, totalVelocity: 20, otherMembersSkills: [] },
      }),
    );
    expect(r.gravityScore).toBe(100);
  });
});
