import { describe, expect, it } from "vitest";
import type { SignalMetric } from "@projectmaster/shared";
import { detect } from "./anomalyService.js";

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
