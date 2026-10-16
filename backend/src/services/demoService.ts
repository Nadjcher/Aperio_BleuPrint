import crypto from "node:crypto";
import type { AuthTokens, UserPublic } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { register } from "./authService.js";
import { createMember, upsertAssignment } from "./resourceService.js";
import { createProject } from "./projectService.js";
import { createMilestone, createTask } from "./planService.js";
import { createRisk } from "./riskService.js";
import { record as recordAnomaly } from "./anomalyService.js";
import { createBlock, createLink } from "./portfolioService.js";
import { generateMinutes } from "./minutesService.js";

/** Date ISO (YYYY-MM-DD) décalée de N jours par rapport à aujourd'hui. */
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Mot de passe fort aléatoire (conforme à la politique, non devinable). */
function demoPassword(): string {
  return `Demo7-${crypto.randomBytes(8).toString("hex")}-Kx9`;
}

/**
 * Crée un compte de démonstration pré-rempli avec un portefeuille réaliste
 * (projets, jalons en retard, risques, anomalie, carte de portefeuille,
 * compte rendu). Objectif : rendre la valeur visible en 10 secondes, sans
 * configuration. Chaque appel crée un compte isolé.
 */
export async function seedDemo(): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const email = `demo+${crypto.randomUUID()}@aperio-demo.io`;
  const { user, tokens } = await register(email, demoPassword(), "Espace de démonstration");
  const ownerId = user.id;

  // ── Équipe ─────────────────────────────────────────────────────────────────
  const alice = await createMember(ownerId, { name: "Alice Martin", skills: ["Front", "UX"] });
  const bruno = await createMember(ownerId, { name: "Bruno Lefèvre", skills: ["Back", "Data"] });
  await createMember(ownerId, { name: "Chloé Dubois", skills: ["QA"] });

  // ── Projet principal ────────────────────────────────────────────────────────
  const p1 = await createProject(ownerId, false, {
    name: "Refonte du site e-commerce",
    repo: "shopify/polaris",
  });
  await AppDataSource.getRepository(Project).update(p1.id, { methodology: "scrum" });
  await upsertAssignment(ownerId, p1.id, { memberId: alice.id, allocationPct: 80, velocity: 8 });
  await upsertAssignment(ownerId, p1.id, { memberId: bruno.id, allocationPct: 60, velocity: 6 });

  // Jalon proche et surchargé (va glisser : 33 pts restants > vélocité 14/sem).
  const m1 = await createMilestone(p1.id, { name: "Sprint 3 — Panier & paiement", dueDate: isoDate(8), orderIndex: 1 });
  await createTask(p1.id, { title: "Intégration paiement Stripe", effortPoints: 20, milestoneId: m1.id, status: "todo" });
  await createTask(p1.id, { title: "Tests du tunnel d'achat", effortPoints: 8, milestoneId: m1.id, status: "todo" });
  await createTask(p1.id, { title: "Page de paiement", effortPoints: 5, milestoneId: m1.id, status: "doing" });

  // Jalon déjà en retard (échéance passée, recette non terminée).
  const m2 = await createMilestone(p1.id, { name: "Livraison bêta", dueDate: isoDate(-4), orderIndex: 2 });
  await createTask(p1.id, { title: "Recette fonctionnelle", effortPoints: 13, milestoneId: m2.id, status: "todo" });

  const m3 = await createMilestone(p1.id, { name: "Mise en production", dueDate: isoDate(35), orderIndex: 3 });
  await createTask(p1.id, { title: "Bascule DNS & supervision", effortPoints: 3, milestoneId: m3.id, status: "todo" });

  await createRisk(p1.id, {
    title: "Prestataire data en retard sur la migration",
    description: "La reprise du référentiel client glisse, bloque la recette.",
    probability: 4,
    impact: 5,
    owner: "Bruno Lefèvre",
  });
  await createRisk(p1.id, {
    title: "API de paiement encore en bêta",
    probability: 3,
    impact: 4,
    owner: "Alice Martin",
  });

  // Anomalie : chute d'activité détectée (met en évidence la surveillance continue).
  await recordAnomaly(p1.id, {
    metric: "commits_per_day",
    observed: 1,
    expected: 9.2,
    stdDev: 1.4,
    zScore: -5.9,
    isAnomaly: true,
    severity: "critical",
  });

  // ── Second projet (pour la vue multi-projets) ───────────────────────────────
  const p2 = await createProject(ownerId, false, {
    name: "Application mobile iOS / Android",
    repo: "facebook/react-native",
  });
  const m4 = await createMilestone(p2.id, { name: "MVP sur les stores", dueDate: isoDate(45), orderIndex: 1 });
  await createTask(p2.id, { title: "Pipeline de build CI", effortPoints: 5, milestoneId: m4.id, status: "doing" });
  await createRisk(p2.id, { title: "Validation App Store incertaine", probability: 3, impact: 3 });

  // ── Carte du portefeuille (dépendances + propagation du rouge) ──────────────
  const ref = await createBlock(ownerId, { projectId: p1.id, name: "Référentiel client", type: "API", targetDate: isoDate(-6) });
  const fact = await createBlock(ownerId, { projectId: p1.id, name: "Facturation", type: "application", targetDate: isoDate(40) });
  const portail = await createBlock(ownerId, { projectId: p1.id, name: "Portail e-commerce", type: "application", targetDate: isoDate(40) });
  const crm = await createBlock(ownerId, { projectId: p1.id, name: "CRM", type: "application", targetDate: isoDate(9) });
  const dwh = await createBlock(ownerId, { projectId: p2.id, name: "Entrepôt de données", type: "lot", targetDate: isoDate(90) });
  await createLink(ownerId, { fromId: fact.id, toId: ref.id });
  await createLink(ownerId, { fromId: portail.id, toId: ref.id });
  await createLink(ownerId, { fromId: portail.id, toId: crm.id });
  await createLink(ownerId, { fromId: crm.id, toId: dwh.id });

  // ── Compte rendu de réunion ─────────────────────────────────────────────────
  await generateMinutes(
    p1.id,
    "Comité de pilotage — hebdomadaire",
    [
      "Comité de pilotage hebdomadaire.",
      "- Décision : la livraison bêta est décalée, priorité au tunnel de paiement.",
      "- Décision : on retient Stripe pour le paiement.",
      "- Action : finaliser la recette fonctionnelle, responsable: Chloé Dubois, avant le " + isoDate(3),
      "- Action : relancer le prestataire data pour la migration @Bruno",
      "- Risque : le retard du référentiel client peut bloquer la recette.",
      "- À clarifier : qui valide les mentions légales du site ?",
    ].join("\n"),
  );

  return { user, tokens };
}
