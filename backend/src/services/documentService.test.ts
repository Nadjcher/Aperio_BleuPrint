import { describe, expect, it } from "vitest";
import { mapDocument, MAX_EXCERPT } from "./documentService.js";

describe("mapDocument (mapper pur)", () => {
  it("normalise les blancs et produit un signal document", () => {
    const sig = mapDocument("p1", {
      filename: "cahier.pdf",
      kind: "pdf",
      text: "  Cahier   des\n\n charges  Aperio  ",
    });
    expect(sig).toMatchObject({ projectId: "p1", source: "document", type: "document", actor: null });
    expect(sig.payload).toMatchObject({
      title: "cahier.pdf",
      kind: "pdf",
      truncated: false,
      excerpt: "Cahier des charges Aperio",
    });
    expect((sig.payload as { chars: number }).chars).toBe("Cahier des charges Aperio".length);
    expect(sig.occurredAt).toBeInstanceOf(Date);
  });

  it("borne l'extrait et signale la troncature (minimisation RGPD)", () => {
    const long = "mot ".repeat(MAX_EXCERPT); // bien au-delà de la limite
    const sig = mapDocument("p1", { filename: "gros.docx", kind: "docx", text: long });
    const payload = sig.payload as { excerpt: string; truncated: boolean; chars: number };
    expect(payload.excerpt.length).toBe(MAX_EXCERPT);
    expect(payload.truncated).toBe(true);
    expect(payload.chars).toBe(MAX_EXCERPT);
  });
});
