# Test de charge — Aperio

Objectif Phase 4 : valider le comportement **à 50+ projets** et sous charge
concurrente, côté lecture (API) comme côté exécution asynchrone (file + workers).

## Outil

[`scripts/loadtest.mjs`](../scripts/loadtest.mjs) — générateur sans dépendance
(fetch natif Node ≥ 18). Il inscrit un admin, seede N projets, frappe les routes
de lecture en concurrence, puis enfile un sync par projet et mesure le vidage de
la file.

```bash
node scripts/loadtest.mjs --api http://localhost:4100 \
  --projects 60 --duration 15 --concurrency 50
```

## Résultats mesurés

Environnement : un process API Node **non clusterisé** + un PostgreSQL 16 local,
dans le conteneur de dev (ressources modestes). Les chiffres absolus seront plus
élevés en prod (plusieurs répliques derrière un load-balancer) ; ce qui compte
ici est l'absence d'erreurs, la stabilité des latences et l'effet du scaling.

### Lecture — 60 projets, concurrence 50, 15 s

| Mesure | Valeur |
| --- | --- |
| Projets seedés | 60 en ~0,5 s |
| Requêtes | 9 427 (0 erreur) |
| Débit | **626 req/s** |
| Latence p50 | 74 ms |
| Latence p95 | 105 ms |
| Latence p99 | 120 ms |

### Asynchrone — 60 syncs

| Mesure | Valeur |
| --- | --- |
| Enfilement | 60 jobs en **179 ms** (réponse `202` immédiate, non bloquante) |
| Vidage de la file | 6,9 s avec 3 workers |

### Montée en charge du worker (débit de file pur)

Drain de 200 jobs à échec instantané (isole le débit de la file, hors I/O) :

| Workers | Débit |
| --- | --- |
| 1 | ~109 jobs/s |
| 3 | ~150 jobs/s |

**Lecture du résultat** : pour des jobs triviaux (quelques accès base, échec en
microsecondes), le goulot est le **PostgreSQL unique partagé** — d'où un gain
sous-linéaire en ajoutant des workers. Pour les vrais syncs (plusieurs secondes,
dominés par les appels GitHub), le temps passé hors base domine : le scaling y
est quasi linéaire, chaque worker traitant un job pendant que les autres
attendent leurs I/O. `FOR UPDATE SKIP LOCKED` garantit qu'un job n'est jamais
pris deux fois quel que soit le nombre de workers (déjà vérifié : 6 jobs ×
3 tentatives = 18 traitements exacts, aucun double-claim).

## Pistes d'optimisation (si la charge l'exige)

- **API** : clusteriser (PM2 / plusieurs répliques derrière le LB) — l'app est
  sans état (JWT), donc scalable horizontalement sans session partagée.
- **Base** : pool de connexions dimensionné, read-replicas pour les lectures,
  index déjà posés sur les colonnes de filtrage (`status`, `runAfter`, `projectId`).
- **File** : augmenter le nombre de workers (`--scale worker=N`) pour les syncs
  I/O-bound ; au besoin, partitionner la table `jobs` ou passer à une file
  dédiée (Redis/SQS) au-delà de ~1000 jobs/s.
- **Rate limiting** : `RATE_LIMIT_MAX` relevé à 1000/15 min (le défaut 100 était
  trop bas pour un SPA qui sonde l'état des jobs).
