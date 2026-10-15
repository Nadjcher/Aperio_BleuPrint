import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@projectmaster/shared";
import { AppError } from "../errors/index.js";
import { requireRole } from "./rbac.js";

function run(min: Role, role: Role | undefined) {
  const req = { user: role ? { role } : undefined } as unknown as Request;
  const next = vi.fn() as unknown as NextFunction;
  const mw = requireRole(min);
  let thrown: unknown;
  try {
    mw(req, {} as Response, next);
  } catch (e) {
    thrown = e;
  }
  return { next, thrown };
}

describe("requireRole — hiérarchie viewer < manager < admin", () => {
  it("laisse passer un rôle égal ou supérieur", () => {
    for (const [min, role] of [
      ["viewer", "viewer"],
      ["viewer", "admin"],
      ["manager", "manager"],
      ["manager", "admin"],
      ["admin", "admin"],
    ] as [Role, Role][]) {
      const { next, thrown } = run(min, role);
      expect(thrown, `${role} >= ${min}`).toBeUndefined();
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("refuse (403) un rôle insuffisant", () => {
    for (const [min, role] of [
      ["manager", "viewer"],
      ["admin", "viewer"],
      ["admin", "manager"],
    ] as [Role, Role][]) {
      const { next, thrown } = run(min, role);
      expect(thrown).toBeInstanceOf(AppError);
      expect((thrown as AppError).status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("refuse (403) en l'absence de rôle", () => {
    const { next, thrown } = run("viewer", undefined);
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
