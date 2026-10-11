import { describe, expect, it } from "vitest";
import { decryptField, encryptField } from "./crypto.js";

describe("chiffrement des champs", () => {
  it("fait un aller-retour chiffrement/déchiffrement", () => {
    const plaintext = "donnée-sensible@example.com";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("produit un chiffré différent à chaque appel (IV aléatoire)", () => {
    const a = encryptField("x");
    const b = encryptField("x");
    expect(a).not.toBe(b);
  });
});
