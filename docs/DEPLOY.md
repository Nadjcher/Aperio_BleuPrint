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

## Option 2 — Plateformes managées (tiers gratuits)

1. **Base** : créer un Postgres managé — [Neon](https://neon.tech) ou [Supabase](https://supabase.com) (tiers gratuits). Récupérer la `DATABASE_URL`.
2. **Backend** : déployer `backend/` sur [Render](https://render.com), [Railway](https://railway.app) ou [Fly.io](https://fly.io) via `backend/Dockerfile` (build depuis la racine du repo). Renseigner les variables d'env (voir `.env.production.example`). Les migrations se jouent au boot.
3. **Frontend** : déployer le statique sur [Vercel](https://vercel.com), [Netlify](https://netlify.com) ou [Cloudflare Pages](https://pages.cloudflare.com).
   - Build : `npm run -w shared build && npm run -w frontend build`
   - Dossier publié : `frontend/dist`
   - Définir `VITE_API_BASE_URL` sur l'URL publique du backend (sinon configurer un proxy/rewrite `/api` → backend).

---

## Variables d'environnement

Voir [`.env.production.example`](../.env.production.example). Essentielles :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion Postgres |
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
