# Architecture technique

Quatre couches : l'interface, l'API, les agents, et les données. Les signaux
entrent par les connecteurs, remontent vers les agents qui décident, et les
décisions redescendent vers l'utilisateur et la base d'apprentissage.

```
Interface (React + Vite + Tailwind)
        │  requêtes / réponses
API (Express + JWT)
        │  orchestration
Agents autonomes (Monitor · Analyst · Planner · Reporter) + learning loop
        │  lecture / écriture
Données (PostgreSQL)
        ▲  signaux
Connecteurs externes (GitHub API · webhooks)
```

## Data flow

1. Les **connecteurs** (`backend/src/connectors/github.ts`) émettent des signaux bruts.
2. Le **pipeline de signaux** (`signalService.ingest`) normalise et stocke les événements.
3. L'**anomaly detection** (`anomalyService.detect`) compare à la baseline (z-score) et marque les écarts.
4. Les **agents** (`backend/src/agents/`) consomment les anomalies, décident, et produisent des décisions.
5. Les **décisions** sont persistées et exposées à l'UI.
6. Le **feedback humain** (`decisions/:id/feedback`) alimente la boucle d'apprentissage (`orchestrator.trustFactor`).

## Composants backend

| Dossier | Rôle |
| --- | --- |
| `config/` | Validation stricte de l'environnement (zod) |
| `db/` | DataSource TypeORM |
| `entities/` | Modèle de données (users, projects, signals, anomalies, decisions, audit) |
| `middleware/` | Auth JWT, RBAC, validation, gestion d'erreurs |
| `security/` | helmet, CORS, rate limiting |
| `services/` | Logique métier (auth, signaux, anomalies, RGPD, audit) |
| `connectors/` | Intégrations externes (GitHub) |
| `agents/` | Les 4 agents + orchestrateur |
| `routes/` | Points d'entrée HTTP |

## Les 4 agents

| Agent | Rôle | Sortie |
| --- | --- | --- |
| Monitor | Surveille et escalade les anomalies critiques | Alerte |
| Analyst | Diagnostique les causes probables | Diagnostic |
| Planner | Propose des actions correctives | Plan d'action |
| Reporter | Synthétise l'état pour les humains | Rapport |

La boucle d'apprentissage pondère la confiance de chaque agent par son taux
d'acceptation passé (lissage de Laplace), de façon explicable.

## Cibles de performance

| Indicateur | Cible |
| --- | --- |
| Latence d'une décision d'agent | < 5 s |
| Disponibilité | 99,5 % |
| Précision des prédictions | 90 %+ |
| Projets suivis en parallèle | 50+ |

## API (v1)

Toutes les routes sont préfixées `/api/v1`.

| Méthode | Route | Rôle min. |
| --- | --- | --- |
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` | public |
| GET | `/auth/me` | authentifié |
| POST | `/auth/logout` | authentifié |
| GET/POST | `/projects` | viewer / manager |
| GET | `/projects/:id` | viewer |
| POST | `/projects/:id/sync` | manager |
| GET | `/projects/:id/signals` · `/anomalies` · `/decisions` | viewer |
| PATCH | `/anomalies/:id` | manager |
| POST | `/decisions/:id/feedback` | manager |
| GET | `/gdpr/export` · DELETE `/gdpr/me` | authentifié |
