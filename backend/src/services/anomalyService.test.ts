import { describe, expect, it } from "vitest";
import type { SignalMetric } from "@projectmaster/shared";
import { detect, detectRobust } from "./anomalyService.js";

function metric(value: number): SignalMetric {
  return {
    projectId: "p1",
    name: "commits_per_day",
    value,
    windowStart: "2026-01-01T00:00:00.000Z",
    windowEnd: "2026-01-02T00:00:00.000Z",
  };
}

describe("detect", () => {
  it("retourne null sans historique suffisant", () => {
    expect(detect([metric(5), metric(5)])).toBeNull();
  });

  it("ne signale pas une valeur dans la norme", () => {
    const metrics = [10, 11, 9, 10, 10].map(metric);
    const result = detect(metrics);
    expect(result).not.toBeNull();
    expect(result!.isAnomaly).toBe(false);
    expect(result!.severity).toBe("info");
  });

  it("signale un pic au-delà de 3 écarts-types comme critique", () => {
    const metrics = [10, 10, 10, 10, 40].map(metric);
    const result = detect(metrics);
    expect(result).not.toBeNull();
    expect(result!.isAnomaly).toBe(true);
    expect(result!.severity).toBe("critical");
    expect(result!.observed).toBe(40);
    expect(result!.expected).toBe(10);
  });

  it("gère un écart-type nul sans division par zéro", () => {
    const metrics = [10, 10, 10, 10, 10].map(metric);
    const result = detect(metrics);
    expect(result!.zScore).toBe(0);
    expect(result!.isAnomaly).toBe(false);
  });
});

describe("detectRobust", () => {
  it("retourne null sans historique suffisant", () => {
    expect(detectRobust([metric(5), metric(5)])).toBeNull();
  });

  it("utilise la médiane comme attendu, pas la moyenne", () => {
    // Baseline contenant un pic aberrant (100) : médiane 10, moyenne 32,5.
    const metrics = [10, 10, 100, 10, 10].map(metric);
    const result = detectRobust(metrics);
    expect(result!.expected).toBe(10);
    expect(result!.isAnomaly).toBe(false);
  });

  it("résiste à un outlier de baseline qui trompe la moyenne", () => {
    // La dernière valeur (12) est normale, mais un pic passé (90) gonfle la
    // moyenne et l'écart-type : la méthode robuste ne se laisse pas berner.
    const metrics = [10, 11, 90, 9, 12].map(metric);
    const robust = detectRobust(metrics);
    expect(robust!.isAnomaly).toBe(false);
  });

  it("signale un vrai pic face à une baseline stable", () => {
    const metrics = [10, 11, 9, 10, 50].map(metric);
    const result = detectRobust(metrics);
    expect(result!.isAnomaly).toBe(true);
    expect(result!.severity).toBe("critical");
  });
});
