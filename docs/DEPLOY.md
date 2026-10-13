# Déploiement en production — Aperio

Deux chemins : **Docker** (autonome, un serveur) ou **plateformes managées** (le plus simple pour démarrer).

En production, le schéma de base est géré par **migrations** (le `synchronize` TypeORM est désactivé). La migration initiale est jouée automatiquement au démarrage du backend (`migrationsRun`).

---

## Option 1 — Docker Compose (un serveur)

Prérequis : Docker + Docker Compose sur la machine.

```bash
cp .env.production.example .env.production
# éditer .env.production : mots de passe, secrets (openssl rand -hex 32), domaine
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Services lancés :

| Service | Rôle | Port |
| --- | --- | --- |
| `postgres` | Base de données (volume persistant `pgdata`) | interne |
| `backend` | API Node/Express, migrations jouées au boot (`WORKER_ENABLED=false`) | interne `4000` |
| `worker` | Dépile la file de jobs asynchrones (sync de projets) | interne |
| `web` | Frontend statique + nginx (proxy `/api` → backend) | `${WEB_PORT}` (8080) |

Le frontend et l'API sont servis sur la **même origine** (nginx proxifie `/api`), donc pas de CORS côté navigateur.

### Exécution asynchrone & montée en charge du worker

Les syncs de projet sont **asynchrones** : l'API enfile un job (réponse `202` + `jobId`) et un **worker dédié** le dépile. La file vit en base et le worker réclame les jobs avec `FOR UPDATE SKIP LOCKED`, donc on peut lancer **plusieurs instances** sans qu'un job soit pris deux fois :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --scale worker=3
```

L'API tourne avec `WORKER_ENABLED=false` (le travail est délégué au service `worker`). En dev / sur une plateforme managée à un seul process, on peut au contraire laisser `WORKER_ENABLED=true` sur l'API et ne pas déployer de worker séparé.

**Retry avec back-off** : un job en échec est reprogrammé automatiquement tant qu'il reste des tentatives (`JOB_MAX_ATTEMPTS`, 3 par défaut), avec un back-off exponentiel (`JOB_BACKOFF_BASE_MS` × 2^(n-1), borné à 1 h). Après épuisement des tentatives il passe en `failed`.

**TLS** : placer un reverse-proxy (Caddy, Traefik, ou nginx hôte) devant `web` pour le HTTPS + HSTS, ou terminer le TLS au niveau du cloud. Mettre `CORS_ORIGIN` à l'URL publique HTTPS.

Mise à jour :

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Images pré-construites (CI)

Le workflow [`images.yml`](../.github/workflows/images.yml) construit et publie
les images sur GHCR à chaque push sur `main` (et sur les tags `v*`) :

- `ghcr.io/<owner>/aperio-backend:latest`
- `ghcr.io/<owner>/aperio-frontend:latest`

Sur le serveur, on peut alors déployer sans rebuild local en pointant le compose
sur ces images (`image:` au lieu de `build:`), ou `docker pull` + redémarrage.

---

## Option 2 — Plateformes managées : Neon + Render/Fly + Vercel

Chemin recommandé (tiers gratuits). Trois briques, fichiers IaC fournis à la
racine : [`render.yaml`](../render.yaml), [`fly.toml`](../fly.toml),
[`vercel.json`](../vercel.json).

### Étape 1 — Base de données (Neon)

1. Créer un projet sur [Neon](https://neon.tech) → copier la **connection string**
   (format `postgres://user:pass@ep-xxx.region.aws.neon.tech/aperio?sslmode=require`).
2. Elle servira de `DATABASE_URL` ; côté app, mettre `DATABASE_SSL=true`.

### Étape 2 — Backend + worker

**Option A — Render (Blueprint, le plus simple).**

1. Render Dashboard → **New → Blueprint** → connecter ce repo. Render lit
   `render.yaml` et crée deux services : `aperio-api` (web) et `aperio-worker`.
2. Renseigner les variables `sync: false` : `DATABASE_URL` (Neon), `CORS_ORIGIN`
   (URL Vercel — voir étape 3), `FIELD_ENCRYPTION_KEY` (`openssl rand -hex 32`),
   `GITHUB_TOKEN`, `METRICS_TOKEN`. Les secrets JWT sont générés automatiquement
   et partagés entre l'API et le worker.
3. Déployer. L'API joue les migrations au boot ; le worker attend le schéma puis
   dépile. Scaler le worker : augmenter le nombre d'instances du service worker.

**Option B — Fly.io (`fly.toml`).**

```bash
fly launch --no-deploy --copy-config --name aperio-api
fly secrets set \
  DATABASE_URL='postgres://…neon…?sslmode=require' \
  JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
  JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
  FIELD_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  CORS_ORIGIN='https://votre-frontend.vercel.app' GITHUB_TOKEN='…'
fly deploy
fly scale count worker=2   # scaler le worker (process dédié)
```

Un seul app Fly, deux process (`app` = API, `worker` = worker dédié) : le worker
force `RUN_MIGRATIONS=false` pour ne pas entrer en course avec l'API.

### Étape 3 — Frontend (Vercel)

1. Vercel → **Add New → Project** → importer ce repo. `vercel.json` configure le
   build monorepo (`shared` puis `frontend`) et publie `frontend/dist`.
2. **Éditer `vercel.json`** : dans la règle de rewrite `/api/:path*`, remplacer
   `https://aperio-api.onrender.com` par l'URL publique réelle du backend. Ce
   proxy sert l'API en **même origine** → aucun CORS côté navigateur, et
   `VITE_API_BASE_URL` reste vide.
3. Déployer. Récupérer l'URL Vercel et la reporter dans `CORS_ORIGIN` du backend
   (utile même avec le proxy, pour les requêtes directes éventuelles).

> Alternative sans proxy : définir `VITE_API_BASE_URL` sur l'URL du backend dans
> Vercel, et `CORS_ORIGIN` sur l'URL Vercel côté backend (CORS activé).

### Ordre de bascule des URLs

Backend d'abord (on obtient son URL) → éditer `vercel.json` (proxy) → déployer le
frontend (on obtient l'URL Vercel) → renseigner `CORS_ORIGIN` côté backend.

---

## Variables d'environnement

Voir [`.env.production.example`](../.env.production.example). Essentielles :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion Postgres |
| `DATABASE_SSL` | `true` pour une base managée (Neon/Supabase/Render externe) |
| `RUN_MIGRATIONS` | `true` sur l'API (migre au boot), `false` sur le worker dédié |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secrets JWT (`openssl rand -hex 32`) |
| `FIELD_ENCRYPTION_KEY` | Clé de chiffrement au repos (32 octets / 64 hex) |
| `CORS_ORIGIN` | Origine publique du frontend |
| `LLM_*` | LLM optionnel (ex. Groq gratuit — voir `backend/.env.example`) |

## Migrations (manuel, si besoin)

Les migrations sont automatiques au boot en prod. Pour les piloter à la main en dev :

```bash
npm run -w backend migration:run      # applique
npm run -w backend migration:revert   # annule la dernière
npm run -w backend migration:generate # régénère après un changement d'entités
```

## Checklist avant mise en ligne

- [ ] Secrets forts générés (`JWT_*`, `FIELD_ENCRYPTION_KEY`) — jamais les valeurs d'exemple
- [ ] `.env.production` hors du dépôt (déjà couvert par `.gitignore`)
- [ ] TLS/HTTPS + HSTS en frontal, `CORS_ORIGIN` sur l'URL HTTPS
- [ ] Sauvegardes Postgres planifiées
- [ ] `GITHUB_TOKEN` à portée lecture seule
- [ ] Voir aussi [`SECURITY.md`](./SECURITY.md)
