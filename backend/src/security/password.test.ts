import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password.js";

describe("passwordSchema", () => {
  it("accepte un mot de passe robuste", () => {
    expect(passwordSchema.safeParse("corrixHorse42Battery").success).toBe(true);
  });

  it("rejette les mots de passe trop courts", () => {
    expect(passwordSchema.safeParse("Abc12345").success).toBe(false);
  });

  it("exige au moins une lettre et un chiffre", () => {
    expect(passwordSchema.safeParse("1234567890123").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefghijklm").success).toBe(false);
  });

  it("rejette les mots de passe courants", () => {
    expect(passwordSchema.safeParse("password1234").success).toBe(false);
  });
});
