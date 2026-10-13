# Observabilité — Aperio

Trois piliers : **logs** structurés, **métriques** Prometheus, **alerting** via
Alertmanager, le tout visualisable dans Grafana. Aucune dépendance applicative
lourde : `prom-client` côté Node, et la stack d'ops tourne en conteneurs à côté.

## 1. Logs

Logs JSON structurés via [pino](https://getpino.io) (lisibles et colorés en dev,
JSON en prod). Chaque requête HTTP est journalisée par `pino-http` (méthode,
route, statut, durée). Les secrets et données personnelles sont **redactés**
(`authorization`, `password`, `token`).

- Niveau réglable par `LOG_LEVEL` (`info` par défaut en prod).
- À agréger avec n'importe quel collecteur JSON (Loki, ELK, CloudWatch…) :
  il suffit de récupérer stdout des conteneurs.

## 2. Métriques (Prometheus)

Exposées au format Prometheus :

| Service | Endpoint |
| --- | --- |
| API | `GET /metrics` (port applicatif `4000`) |
| Worker dédié | `GET /metrics` sur `WORKER_METRICS_PORT` (`9091`) |

Protégeable par jeton : si `METRICS_TOKEN` est défini, `/metrics` exige
`Authorization: Bearer <token>`.

### Métriques exposées

- **Runtime Node (défaut `prom-client`)** : CPU, mémoire résidente (`process_resident_memory_bytes`),
  event-loop lag (`nodejs_eventloop_lag_p99_seconds`), handles, GC.
- **HTTP** (API) :
  - `http_requests_total{method,route,status}`
  - `http_request_duration_seconds` (histogramme → p50/p95/p99)
  - La **route est le motif matché** (`/api/v1/projects/:id/sync`), pas l'URL
    brute : pas d'explosion de cardinalité sur les ids.
- **Jobs** (worker) :
  - `jobs_processed_total{type,outcome}` — `outcome` = `done` | `retry` | `failed`
  - `job_processing_duration_seconds{type,outcome}` (histogramme)
  - `jobs_by_status{status}` — taille de file par statut, mesurée à chaque scrape
    (toujours fraîche ; si la base est indisponible le scrape ne casse pas).

## 3. Santé & sondes

| Endpoint | Sens | Code |
| --- | --- | --- |
| `GET /live` | process vivant (aucune dépendance) | 200 |
| `GET /ready` | prêt à servir (base joignable) | 200 / 503 |
| `GET /health` | santé globale (base joignable) | 200 / 503 |

Le **code HTTP** reflète l'état (503 si la base est down) pour que les
load-balancers et la sonde blackbox de Prometheus détectent la dégradation.
Le worker expose `GET /healthz` (liveness) sur son port métriques.

## 4. Alerting

Règles dans [`deploy/prometheus/alerts.yml`](../deploy/prometheus/alerts.yml),
routées par [`deploy/alertmanager/alertmanager.yml`](../deploy/alertmanager/alertmanager.yml) :

| Alerte | Déclencheur | Sévérité |
| --- | --- | --- |
| `TargetDown` | une cible ne répond plus (1 min) | critical |
| `HighHttp5xxRate` | > 5 % de 5xx sur 5 min | critical |
| `HighApiLatencyP95` | p95 HTTP > 1 s sur 10 min | warning |
| `JobBacklogGrowing` | > 50 jobs en attente sur 10 min | warning |
| `HighJobFailureRate` | > 20 % de jobs en échec définitif sur 10 min | critical |
| `WorkerStalled` | file non vide mais 0 job traité sur 15 min | critical |
| `EventLoopLagHigh` | lag p99 > 200 ms sur 10 min | warning |
| `HighResidentMemory` | RSS > 512 Mio sur 15 min | warning |

Le receiver par défaut est un squelette : décommenter le bloc `slack_configs`
(ou brancher PagerDuty / email) dans `alertmanager.yml`.

## 5. Lancer la stack d'observabilité

À côté de la prod (même réseau Docker, pour scraper `backend` et `worker` par nom) :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml \
  --env-file .env.production up -d
```

| Outil | URL | Notes |
| --- | --- | --- |
| Grafana | http://localhost:3000 | admin / `${GRAFANA_PASSWORD:-admin}` — dashboard « Aperio — Overview » provisionné |
| Prometheus | http://localhost:9090 | cibles + règles d'alerte |
| Alertmanager | http://localhost:9093 | alertes actives & silences |

Le scrape du worker utilise la **découverte DNS** (`dns_sd_configs`) : avec
`--scale worker=N`, Prometheus découvre et scrape automatiquement toutes les
instances.

## 6. Vérifier en local (sans Docker)

```bash
# API
curl -s localhost:4000/metrics | grep http_requests_total
curl -s -o /dev/null -w '%{http_code}\n' localhost:4000/ready
# Worker
curl -s localhost:9091/metrics | grep jobs_processed_total
```
