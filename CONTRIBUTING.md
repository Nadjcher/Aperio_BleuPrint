# Contribuer à Aperio

Merci de contribuer ! Ce guide résume l'essentiel pour développer en local.

## Prérequis

- **Node.js ≥ 20**
- **PostgreSQL 16** (local ou managé)
- npm (workspaces)

## Installation

```bash
npm install
cp backend/.env.example backend/.env   # puis renseigner DATABASE_URL, secrets…
cp frontend/.env.example frontend/.env # VITE_API_BASE_URL si besoin
npm run build                          # shared → backend → frontend
```

Générez les secrets requis (voir `backend/.env.example`) :
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥ 16 car.) et `FIELD_ENCRYPTION_KEY`
(64 hex = 32 octets).

## Lancer en développement

```bash
npm run dev            # backend (4000) + frontend (5173) en parallèle
```

En dev, le schéma est synchronisé automatiquement (`synchronize`). En prod, les
**migrations** sont jouées au démarrage (`RUN_MIGRATIONS=true`).

## Qualité (à faire avant de pousser)

```bash
npm run lint           # ESLint (monorepo)
npm run format         # Prettier
npm test               # tests unitaires (backend + shared)
npm run build          # compile les 3 workspaces
```

**Tests E2E + accessibilité** (Playwright + axe-core), contre une pile locale :

```bash
npm run e2e            # réinitialise la base, lance API + front, exécute e2e/
```

## Conventions

- **Monorepo** : `shared` (types source de vérité), `backend` (Express/TypeORM),
  `frontend` (React/Vite). Les types partagés vivent dans `shared` et sont
  importés via `@projectmaster/shared`.
- **Architecture backend** : `routes` (validation + mapping) → `services`
  (logique + accès données) → entités. Les routes ne touchent pas directement
  TypeORM ; la propriété d'un projet passe par `projectService.getOwnedProject`.
- **Erreurs** : lever `AppError` (de `src/errors`) ; le format de réponse est
  unifié par `middleware/errorHandler`.
- **Migrations** : toute modification de schéma passe par une migration
  versionnée et réversible (`src/migrations/<timestamp>-Nom.ts`).
- **Sécurité** : ne jamais affaiblir chiffrement, RBAC, rate limiting ni RGPD.
  Les secrets (tokens de connecteur, webhooks) sont chiffrés au repos.
- **Tests** : ajouter des tests pour tout nouveau comportement ; la logique pure
  (calculs) est extraite et testée sans base.

## Documentation

- `docs/USER_GUIDE.md` — guide utilisateur (modes simple/expert).
- `docs/ARCHITECTURE.md`, `docs/METHODOLOGIES.md`, `docs/AUDIT.md`,
  `docs/SECURITY.md`, `docs/COMPLIANCE.md`, `docs/LOADTEST.md`,
  `docs/OBSERVABILITY.md`, `docs/DEPLOY.md`.
