import { describe, expect, it } from "vitest";
import type { AccessTokenPayload } from "@projectmaster/shared";
import { AppError } from "../errors/index.js";
import { sha256, signAccess, verifyAccess } from "./tokenService.js";

const payload: AccessTokenPayload = {
  sub: "user-1",
  email: "a@b.io",
  role: "manager",
  isGuest: false,
};

describe("tokenService — hash", () => {
  it("sha256 est déterministe et dépend de l'entrée", () => {
    expect(sha256("x")).toBe(sha256("x"));
    expect(sha256("x")).not.toBe(sha256("y"));
    expect(sha256("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("tokenService — JWT d'accès", () => {
  it("signe puis vérifie en préservant le payload", () => {
    const token = signAccess(payload);
    const decoded = verifyAccess(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("a@b.io");
    expect(decoded.role).toBe("manager");
    expect(decoded.isGuest).toBe(false);
  });

  it("rejette un jeton falsifié", () => {
    const token = signAccess(payload);
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
    expect(() => verifyAccess(tampered)).toThrow(AppError);
  });

  it("rejette une chaîne qui n'est pas un JWT", () => {
    try {
      verifyAccess("pas-un-jwt");
      expect.unreachable("aurait dû lever");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(401);
    }
  });
});
