# Décisions actionnables : approbation & rollback

Les agents ne font plus que suggérer : ils peuvent proposer (et, en option,
exécuter) des **actions concrètes et réversibles**, encadrées par un système
d'approbation et d'annulation.

## Cycle de vie d'une décision

```
proposed ─┬─► (action faible impact + AGENT_AUTONOMY=auto) ─► executed ─► undone (≤24h)
          └─► pending_approval ─► approve ─► executed ─► undone (≤24h)
                                └─► reject ─► rejected
                                └─► (délai dépassé) ─► expired
```

- **Défaut sûr** : `AGENT_AUTONOMY=propose` → **aucune** action ne s'exécute sans
  approbation humaine. `auto` autorise l'exécution immédiate des actions à faible
  impact (auto-approuvées).
- **Rollback** : toute action exécutée est annulable pendant **24 h** (snapshots
  avant/après). Au-delà, l'annulation est refusée (`undo_window_closed`).
- **Expiration** : une approbation non donnée avant `approvalDeadline` (24 h)
  passe en `expired` (tâche de maintenance).

## Actions disponibles (réversibles)

| Type | Effet | Approbation |
| --- | --- | --- |
| `anomaly.acknowledge` | anomalie → `acknowledged` | auto-approuvée (impact faible) |
| `anomaly.resolve` | anomalie → `resolved` | **requiert approbation** |
| `anomaly.dismiss` | anomalie → `dismissed` | **requiert approbation** |

Chaque action définit `execute`/`undo`/`simulate` (registre `agents/actions.ts`).
De nouveaux types s'ajoutent en implémentant `ActionSpec` — y compris, plus tard,
des actions **en écriture** via MCP (ex. changer un ticket Jira), avec le même
cadre d'approbation + rollback.

## API (manager, propriétaire du projet)

| Endpoint | Effet |
| --- | --- |
| `POST /api/v1/decisions/:id/simulate` | Prévisualise l'effet (before/after) sans l'appliquer |
| `POST /api/v1/decisions/:id/approve` | Approuve → exécute l'action |
| `POST /api/v1/decisions/:id/reject` | Rejette (aucune exécution) |
| `POST /api/v1/decisions/:id/undo` | Annule (rollback) dans la fenêtre de 24 h |

Qui agit sur quoi : les agents **Monitor** (acknowledge) et **Planner** (resolve)
attachent une action à leurs décisions ; les autres restent des recommandations.

## Audit

Chaque approve/reject/undo est tracé dans le journal d'audit
(`decision.approve` / `decision.reject` / `decision.undo`). Les snapshots
avant/après sont stockés sur la décision (`beforeSnapshot` / `afterSnapshot`).
