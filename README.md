# Aperio

Outil de gestion de projet **prédictif** et **agentique** : il ne se contente pas
d'afficher l'état des projets, il détecte les signaux faibles en continu et déploie
des agents autonomes qui diagnostiquent, planifient et rendent compte.

Voir le blueprint produit complet (plan, architecture, sécurité & RGPD) dans
[`docs/`](./docs). Déploiement en production : [`docs/DEPLOY.md`](./docs/DEPLOY.md).
Contribuer en local : [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Fonctionnalités

- **Deux niveaux d'interface** : mode **simple** (chef de projet — santé, risque,
  à-faire, langage métier + glossaire) et mode **expert** (détails techniques).
- **Onboarding guidé** en 3 étapes.
- **Connecteurs** multi-sources : **GitHub, GitLab, Jira, Linear** (token chiffré
  au repos, config par projet) → signaux normalisés.
- **Agents autonomes** (Monitor · Analyst · Planner · Reporter) + boucle
  d'apprentissage ; **décisions** avec approbation humaine réversible.
- **Planning** : jalons, tâches, **date de livraison prévue** (fourchette),
  chemin critique, détection des retards.
- **Méthodologies** par projet (Kanban / Scrum / PRINCE2 / SAFe) : vocabulaire
  et rapports adaptés, même moteur.
- **Registre des risques** (probabilité × impact) et **rapports normés**.
- **Notifications** e-mail + **Slack** (webhook par projet).
- **Sécurité & RGPD** : JWT + RBAC, chiffrement au repos, audit, export/effacement.

## Documentation

| Document | Pour qui |
| --- | --- |
| [Guide d'utilisation](./docs/USER_GUIDE.md) | Utilisateurs — prise en main, onboarding, RGPD côté usager |
| [Architecture](./docs/ARCHITECTURE.md) | Développeurs — conception des 4 couches |
| [Déploiement](./docs/DEPLOY.md) | Ops — Docker, plateformes managées, worker scalable |
| [Observabilité](./docs/OBSERVABILITY.md) | Ops — logs, métriques Prometheus, alerting |
| [Sécurité & RGPD](./docs/SECURITY.md) | Ops / conformité — défense en profondeur, droits RGPD |
| [Test de charge](./docs/LOADTEST.md) | Ops — méthodologie et résultats 50+ projets |
| [Conformité (RGPD/cookies/accessibilité)](./docs/COMPLIANCE.md) | Éditeur — registre des données, sous-traitants, checklist avant mise en ligne |
| [Feuille de route](./docs/ROADMAP.md) | Tous — avancement des 4 phases |

**LLM gratuit (optionnel)** — les agents et les synthèses peuvent être enrichis
par un LLM compatible OpenAI : **Ollama** (local, gratuit) ou **Groq** (hébergé,
gratuit, Llama 3.3). Sans configuration, fonctionnement heuristique. Détails
dans `backend/.env.example`.

**MCP (optionnel)** — avec le provider Anthropic, le **Planner** peut appeler des
outils exposés par des serveurs **MCP distants** (connecteur MCP de l'API Claude)
pour enrichir ses plans d'action. Config via `MCP_SERVERS` (voir `backend/.env.example`).

## Architecture (4 couches)

```
Interface (React + Vite + Tailwind)
        │  requêtes / réponses
API (Express + JWT)
        │  orchestration
Agents autonomes (Monitor · Analyst · Planner · Reporter) + learning loop
        │  lecture / écriture
Données (PostgreSQL)
        ▲  signaux
Connecteurs externes (GitHub · GitLab · Jira · Linear · webhooks)
```

## Structure du monorepo

| Dossier | Rôle |
| --- | --- |
| `shared/` | Types et schémas partagés (signaux, anomalies, décisions) |
| `backend/` | API Express, TypeORM, agents, connecteurs, sécurité, RGPD |
| `frontend/` | Dashboard React + TypeScript |
| `docs/` | Architecture, sécurité, RGPD |

## Démarrage rapide

Prérequis : Node.js ≥ 20, PostgreSQL (ou Docker).

```bash
# 1. Dépendances (monorepo npm workspaces)
npm install

# 2. Base de données via Docker (optionnel)
docker compose up -d

# 3. Configuration
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Migrations
npm run -w backend migration:run

# 5. Lancer backend + frontend
npm run dev
```

- API : http://localhost:4000 (santé : `GET /health`)
- Frontend : http://localhost:5173

## Scripts racine

| Commande | Effet |
| --- | --- |
| `npm run dev` | Lance backend + frontend en parallèle |
| `npm run build` | Build des trois workspaces |
| `npm run lint` | Lint du monorepo (ESLint) |
| `npm run format` | Formatage Prettier |
| `npm test` | Tests unitaires (backend + shared) |
| `npm run e2e` | Tests end-to-end + accessibilité (Playwright + axe) |

## Sécurité & RGPD

La sécurité est intégrée dès le départ : HTTPS/TLS en frontal, JWT + bcrypt,
rate limiting, en-têtes de sécurité (helmet), RBAC, validation des entrées,
journal d'audit, chiffrement au repos et endpoints RGPD (accès, effacement,
portabilité). Détails dans [`docs/SECURITY.md`](./docs/SECURITY.md).

## Feuille de route

La feuille de route produit est décrite dans [`docs/ROADMAP.md`](./docs/ROADMAP.md).
Avancement : fondation + simplicité d'usage (modes simple/expert), planning &
date de livraison, méthodologies & risques, connecteurs multi-sources &
notifications, puis qualité (E2E, accessibilité, doc) — livrés. Détail du
refactoring de fondation : [`docs/AUDIT.md`](./docs/AUDIT.md).
