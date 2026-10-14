import { describe, expect, it } from "vitest";
import { assessForecast, densify, trendFromDense } from "./forecastService.js";
import type { SignalMetric, TrendMetric } from "@projectmaster/shared";

const now = new Date("2026-10-28T00:00:00Z");

function metric(name: string, cur: number, prev: number): TrendMetric {
  return {
    metric: name,
    current7d: cur,
    previous7d: prev,
    changePct: Math.round(((cur - prev) / Math.max(prev, 1)) * 100),
    direction: cur > prev ? "up" : cur < prev ? "down" : "flat",
  };
}

describe("forecast — tendances", () => {
  it("densify place les valeurs au bon jour", () => {
    const series: SignalMetric[] = [
      { projectId: "p", name: "commits", value: 5, windowStart: "2026-10-27T00:00:00Z", windowEnd: "" },
      { projectId: "p", name: "commits", value: 3, windowStart: "2026-10-21T00:00:00Z", windowEnd: "" },
    ];
    const dense = densify(series, 28, now);
    expect(dense).toHaveLength(28);
    // index 27 = aujourd'hui (28/10) ; 27/10 = hier = index 26 ; 21/10 = index 20.
    expect(dense[26]).toBe(5);
    expect(dense[20]).toBe(3);
  });

  it("trendFromDense calcule la variation semaine/semaine", () => {
    const dense = new Array(28).fill(0);
    for (let i = 21; i < 28; i++) dense[i] = 2; // 14/semaine courante
    for (let i = 14; i < 21; i++) dense[i] = 10; // 70/semaine précédente
    const t = trendFromDense("commits", dense);
    expect(t.current7d).toBe(14);
    expect(t.previous7d).toBe(70);
    expect(t.direction).toBe("down");
    expect(t.changePct).toBe(-80);
  });
});

describe("forecast — évaluation du risque", () => {
  it("chute d'activité → risque critique", () => {
    const r = assessForecast([metric("commits", 10, 100)], 28);
    expect(r.riskLevel).toBe("critical");
    expect(r.horizonWeeks).toBe(2);
    expect(r.signals.some((s) => s.severity === "critical")).toBe(true);
  });

  it("stable → ok, pas d'horizon", () => {
    const r = assessForecast([metric("commits", 50, 50), metric("issues", 10, 10)], 28);
    expect(r.riskLevel).toBe("ok");
    expect(r.horizonWeeks).toBeNull();
  });

  it("confiance faible quand l'historique est court", () => {
    const r = assessForecast([metric("commits", 50, 50)], 5);
    expect(r.confidence).toBeLessThan(0.35);
    expect(r.recommendations.join(" ")).toContain("Historique");
  });

  it("backlog en hausse + activité en baisse → signal", () => {
    const r = assessForecast([metric("commits", 40, 50), metric("issues", 30, 10)], 28);
    expect(r.signals.some((s) => s.label.includes("Backlog"))).toBe(true);
  });
});
