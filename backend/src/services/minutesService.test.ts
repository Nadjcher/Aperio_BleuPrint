import { describe, expect, it } from "vitest";
import { heuristicMinutes } from "./minutesService.js";

describe("heuristicMinutes (extraction déterministe)", () => {
  it("classe les lignes en décisions / actions / risques / questions", () => {
    const notes = [
      "Réunion de lancement du projet Refonte.",
      "- Décision : on part sur une mise en ligne en novembre.",
      "- Action : préparer la maquette, responsable: Alice, avant le 2026-10-25",
      "- Risque : le prestataire data est en retard, ça peut bloquer.",
      "- Reste à clarifier le budget hébergement ?",
    ].join("\n");

    const m = heuristicMinutes(notes);

    expect(m.summary.length).toBeGreaterThan(0);
    expect(m.decisions).toHaveLength(1);
    expect(m.decisions[0]).toMatch(/mise en ligne en novembre/);
    expect(m.risks).toHaveLength(1);
    expect(m.risks[0]).toMatch(/prestataire data/);
    expect(m.openQuestions).toHaveLength(1);

    expect(m.actions).toHaveLength(1);
    expect(m.actions[0]).toMatchObject({ owner: "Alice", due: "2026-10-25" });
    expect(m.actions[0].description).toMatch(/maquette/);
  });

  it("ignore les lignes trop courtes et renvoie des listes vides sans mot-clé", () => {
    const m = heuristicMinutes("Bonjour.\n\nok\nUn simple échange informel sans structure particulière.");
    expect(m.decisions).toEqual([]);
    expect(m.actions).toEqual([]);
    expect(m.risks).toEqual([]);
    expect(m.openQuestions).toEqual([]);
    expect(m.summary).not.toBe("");
  });
});
