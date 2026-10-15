import { describe, expect, it } from "vitest";
import { severityOf } from "./riskService.js";

describe("severityOf (score probabilité × impact)", () => {
  it("faible en dessous de 6", () => {
    expect(severityOf(1)).toBe("low");
    expect(severityOf(5)).toBe("low");
  });
  it("moyen de 6 à 14", () => {
    expect(severityOf(6)).toBe("medium");
    expect(severityOf(14)).toBe("medium");
  });
  it("élevé à partir de 15", () => {
    expect(severityOf(15)).toBe("high");
    expect(severityOf(25)).toBe("high");
  });
});
