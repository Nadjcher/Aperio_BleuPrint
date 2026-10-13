import { z } from "zod";

/**
 * Bases triviales : un mot de passe qui en *contient* une est rejeté, quelle
 * que soit sa longueur (ex. « password1234 », « azerty2024 »).
 */
const WEAK_BASES = [
  "password",
  "motdepasse",
  "azerty",
  "qwerty",
  "123456",
  "changeme",
  "aperio",
  "letmein",
  "iloveyou",
];

/**
 * Politique de mot de passe : ≥ 12 caractères, au moins une lettre et un
 * chiffre, et pas un mot de passe trivialement courant. Volontairement simple
 * (pas de contrainte de symbole, qui pousse aux variations prévisibles) mais
 * robuste sur la longueur — le facteur qui compte le plus.
 */
export const passwordSchema = z
  .string()
  .min(12, "Mot de passe de 12 caractères minimum")
  .max(200, "Mot de passe trop long")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Le mot de passe doit contenir au moins une lettre et un chiffre",
  })
  .refine(
    (v) => {
      const lower = v.toLowerCase();
      return !WEAK_BASES.some((base) => lower.includes(base));
    },
    { message: "Mot de passe trop courant" },
  );
