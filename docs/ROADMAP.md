# Feuille de route (24 semaines)

Le produit se construit en 4 phases. Chaque phase livre quelque chose
d'utilisable ; on ne passe à la suivante qu'une fois la précédente démontrée.

## Phase 1 — Signaux & détection (semaines 1–4)

Collecter les signaux bruts et repérer les anomalies.

- [x] Scaffolds backend + frontend, auth JWT, connexion PostgreSQL
- [x] Connecteur GitHub : commits, PRs, issues
- [x] Pipeline de collecte et d'agrégation de signaux
- [x] Anomaly detection v1 : écart par rapport à la baseline (z-score)
- [x] Dashboard minimal affichant signaux, anomalies et décisions

## Phase 2 — Agents & apprentissage (semaines 5–8)

Déployer les 4 agents et la boucle d'apprentissage.

- [x] Monitor · Analyst · Planner · Reporter (heuristiques v1)
- [x] Learning loop : feedback humain → pondération de la confiance
- [x] Enrichissement des agents par LLM (multi-provider : Claude ou Llama gratuit, repli heuristique)
- [ ] File d'exécution asynchrone des agents

## Phase 3 — Synthèse & planification (semaines 9–12)

Passer des alertes à la valeur métier.

- [x] Document synthesis : résumés automatiques de l'état projet (LLM + repli)
- [x] Planning assisté : plan correctif enrichi par le Planner
- [x] Reporting hebdo/mensuel généré (`/projects/:id/reports`)
- [x] Affinage de la détection : score z robuste (médiane + MAD)

## Phase 4 — Production-ready (semaines 13–24)

Fiabilité et passage à l'échelle.

- [x] Migrations de production (remplacement de `synchronize`, jouées au boot)
- [x] LLM gratuit type Llama (Ollama / Groq, API compatible OpenAI)
- [x] Déploiement Docker (backend + frontend nginx + Postgres) — voir `DEPLOY.md`
- [ ] Durcissement sécurité & conformité RGPD (voir `SECURITY.md`)
- [ ] Observabilité, monitoring, alerting opérationnel
- [ ] Montée en charge : 50+ projets
- [ ] Onboarding et documentation utilisateur

## État de ce dépôt

La **fondation** est en place : chaque couche et chaque agent sont démarrables.
La Phase 1 est fonctionnelle de bout en bout (connecteur GitHub → détection →
agents → UI) ; la Phase 2 l'est au niveau heuristique avec la boucle
d'apprentissage. Les cases cochées ci-dessus reflètent ce qui est livré.
