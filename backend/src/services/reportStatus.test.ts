import { describe, expect, it } from "vitest";
import { computeRag } from "./reportService.js";

const base = {
  criticalAnomalies: 0,
  warningAnomalies: 0,
  lateMilestones: [] as string[],
  highRisks: [] as string[],
  mediumRisks: 0,
  deliveryUnknown: false,
};

describe("computeRag", () => {
  it("vert quand rien ne cloche", () => {
    const r = computeRag(base);
    expect(r.rag).toBe("vert");
    expect(r.headline).toMatch(/délais/);
  });

  it("rouge si un jalon est en retard", () => {
    const r = computeRag({ ...base, lateMilestones: ["Sprint 3"] });
    expect(r.rag).toBe("rouge");
    expect(r.headline).toContain("1 jalon(s) en retard");
  });

  it("rouge si anomalie critique ou risque majeur", () => {
    expect(computeRag({ ...base, criticalAnomalies: 1 }).rag).toBe("rouge");
    expect(computeRag({ ...base, highRisks: ["Prestataire"] }).rag).toBe("rouge");
  });

  it("le rouge prime sur l'orange", () => {
    const r = computeRag({ ...base, lateMilestones: ["A"], warningAnomalies: 3, mediumRisks: 2 });
    expect(r.rag).toBe("rouge");
  });

  it("orange pour de la vigilance sans blocage", () => {
    expect(computeRag({ ...base, warningAnomalies: 2 }).rag).toBe("orange");
    expect(computeRag({ ...base, mediumRisks: 1 }).rag).toBe("orange");
    expect(computeRag({ ...base, deliveryUnknown: true }).rag).toBe("orange");
  });

  it("agrège les motifs dans la justification", () => {
    const r = computeRag({ ...base, lateMilestones: ["A", "B"], criticalAnomalies: 1 });
    expect(r.headline).toContain("2 jalon(s) en retard probable");
    expect(r.headline).toContain("1 anomalie(s) critique(s)");
  });
});
