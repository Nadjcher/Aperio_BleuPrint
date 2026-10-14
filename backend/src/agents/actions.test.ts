import { describe, expect, it } from "vitest";
import { canUndo, getAction, isAutoApproved, UNDO_WINDOW_MS } from "./actions.js";

describe("actions registry & policy", () => {
  it("acknowledge est auto-approuvée (impact faible)", () => {
    expect(isAutoApproved("anomaly.acknowledge")).toBe(true);
  });

  it("resolve et dismiss nécessitent une approbation", () => {
    expect(isAutoApproved("anomaly.resolve")).toBe(false);
    expect(isAutoApproved("anomaly.dismiss")).toBe(false);
  });

  it("'none' / inconnu → pas d'action, pas d'auto-approbation", () => {
    expect(getAction("none")).toBeNull();
    expect(getAction(undefined)).toBeNull();
    expect(isAutoApproved("none")).toBe(false);
  });

  it("canUndo : vrai dans la fenêtre, faux après 24 h", () => {
    const now = Date.now();
    expect(canUndo(new Date(now - 1000), now)).toBe(true);
    expect(canUndo(new Date(now - UNDO_WINDOW_MS + 1000), now)).toBe(true);
    expect(canUndo(new Date(now - UNDO_WINDOW_MS - 1000), now)).toBe(false);
    expect(canUndo(null, now)).toBe(false);
  });
});
