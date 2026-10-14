# Test de charge — Aperio

Objectif Phase 4 : valider le comportement **à 50+ projets** et sous charge
concurrente, côté lecture (API) comme côté exécution asynchrone (file + workers).

## Outil

[`scripts/loadtest.mjs`](../scripts/loadtest.mjs) — générateur sans dépendance
(fetch natif Node ≥ 18). Il inscrit un admin, seede N projets, frappe les routes
de lecture CRUD en concurrence, puis **les routes analytiques** (briefing,
forecast, resourcing, members), puis enfile un sync par projet et mesure le
vidage de la file.

> Le premier compte inscrit sur une base vierge devient `admin` ; relancer le
> test sur une base déjà peuplée inscrit un `viewer` qui ne peut pas créer de
> projet (403). Pour une mesure propre, repartir d'une base fraîche.

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

### Routes analytiques — concurrence 50 (par route, isolée)

Les routes agrègent des données (briefing = tous les projets du compte ; forecast
= 3 séries temporelles ; resourcing = affectations + membres). Mesurées isolément
à 50 clients simultanés, elles restent toutes sous ~310 ms au p99, sans erreur :

| Route | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| `GET /briefing` | 122 ms | 287 ms | 313 ms | 331 ms |
| `GET /members` | 88 ms | 122 ms | 134 ms | 142 ms |
| `GET /projects/:id/forecast` | 108 ms | 135 ms | 144 ms | 165 ms |
| `GET /projects/:id/resourcing` | 112 ms | 153 ms | 191 ms | 265 ms |

Le run **combiné** (les 4 routes en rafale continue) fait apparaître des pics de
queue épisodiques (p95 ~1,8–2 s sur ~5 % des requêtes) qui ne se reproduisent
pas en isolation : ils tiennent à des à-coups transitoires (GC, chevauchement de
phases du test), pas au coût des routes. Usage réel : ces routes sont appelées
~une fois par chargement de vue, pas 50 fois en simultané en continu.

**Optimisations appliquées suite à ce test :**

- **Briefing** : suppression d'un N+1 (2 requêtes par projet → 2 requêtes
  groupées par `IN (...)`, regroupées en mémoire) — indispensable à 50+ projets.
- **Index** : ajout de `(projectId, type, occurredAt)` sur `signals` pour servir
  les agrégats temporels par métrique (`dailyCounts`, appelé 3× par forecast).
- **Pool** : taille du pool PostgreSQL configurable (`DB_POOL_MAX`, défaut 20).

### Asynchrone — 60 syncs

| Mesure | Valeur |
| --- | --- |
| Enfilement | 60 jobs en **< 200 ms** (réponse `202` immédiate, non bloquante) |
| Vidage de la file | 6,9 s avec 3 workers |

> En local sans `GITHUB_TOKEN`, les 60 syncs échouent (pas d'accès à l'API
> GitHub) : c'est attendu. Le point vérifié est que les échecs sont **capturés**
> (statut `failed`, aucun job bloqué) et que la file se vide sans à-coup — la
> reprise avec back-off exponentiel reprogramme les tentatives sans bloquer les
> lectures (vérifié : les routes restent rapides pendant que le worker rejoue).

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
- **Base** : pool de connexions dimensionné (`DB_POOL_MAX`), read-replicas pour
  les lectures, index posés sur les colonnes de filtrage (`status`, `runAfter`,
  `projectId`, et `(projectId, type, occurredAt)` pour les agrégats de signaux).
- **Briefing/analytique** : requêtes groupées (pas de N+1 par projet) ; au besoin,
  cache court (quelques secondes) sur le briefing, qui agrège tout le compte.
- **File** : augmenter le nombre de workers (`--scale worker=N`) pour les syncs
  I/O-bound ; au besoin, partitionner la table `jobs` ou passer à une file
  dédiée (Redis/SQS) au-delà de ~1000 jobs/s.
- **Rate limiting** : `RATE_LIMIT_MAX` relevé à 1000/15 min (le défaut 100 était
  trop bas pour un SPA qui sonde l'état des jobs).
