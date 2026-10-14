# Aperio — Diagnostic (état réel du code)

> Établi en **lisant le code** (`backend/src/agents`, `/llm`, `/connectors`),
> pas de mémoire ni d'estimation. Date : 2026-10-14.

## Verdict en une phrase

Aperio a un **socle technique excellent et déployé**, mais c'est aujourd'hui un
**analyseur qui suggère**, branché sur **une seule source (GitHub)** — pas
encore l'orchestrateur autonome multi-sources décrit dans le guide.

## ✅ 5 forces

1. **Socle prod complet** : Neon + Render + Vercel, migrations au boot, worker
   asynchrone (retry/back-off), observabilité (Prometheus/Grafana/alerting),
   sécurité & RGPD, pages légales, accessibilité.
2. **Détection explicable** : z-score + robuste médiane/MAD, avec sévérité.
3. **Pipeline fiable** : file de jobs en base, `FOR UPDATE SKIP LOCKED`, retry.
4. **Learning loop v1** : `trustFactor` pondère la confiance par le feedback
   humain (Laplace).
5. **LLM multi-provider + MCP amorcé**, à dégradation gracieuse.

## ❌ 5 faiblesses critiques

1. **Agents non autonomes.** `orchestrator.runAgents()` enregistre chaque
   décision en `status: "proposed"`. **Aucun** `execute` / `approve` / `rollback`
   / `snapshot` dans le code (grep = 0 résultat). → Ce sont des **suggesteurs**.
2. **Une seule source de données** : GitHub (`connectors/github.ts`). Pas de
   Jira/Slack/Xray/Confluence/… → vision partielle du projet.
3. **MCP minimal** : 1 point d'intégration (Planner), **0 serveur** configuré par
   défaut, Anthropic only, **pas d'orchestration** (dispatcher, parallélisation,
   cache, audit).
4. **Aucune feature différenciante** : pas de simulation, gravité cross-projet,
   forecasting 4 semaines, ni briefing proactif.
5. **Signaux limités** : uniquement l'activité du dépôt. Pas de vélocité, scope,
   couverture de tests, sentiment équipe → la détection rate les vrais risques.

## 🔌 Connecteurs

| Existants | Manquants (guide) |
| --- | --- |
| GitHub | Jira, Slack, Xray, Confluence, Figma, AWS, Linear, Notion, Datadog |

## 🤖 Agents : autonomes ou simulés ?

**Simulés (analyseurs).** Contrat : `run(ctx) → DraftDecision[]` (titre, rationale,
actions, confidence) ; l'orchestrateur les persiste en `proposed`. Le feedback
humain n'entraîne que la confiance — **il ne déclenche aucune action**.

| Agent | Rôle réel | Autonome ? |
| --- | --- | --- |
| Monitor | Escalade les anomalies critiques | Non (suggère) |
| Analyst | Diagnostique (LLM/heuristique) | Non |
| Planner | Plan correctif (LLM + MCP/heuristique) | Non |
| Reporter | Synthèse d'état | Non |

## Écart avec le guide (ce qui manque pour « se différencier »)

| Brique du guide | État actuel |
| --- | --- |
| 10+ serveurs MCP orchestrés | 1 point d'intégration, 0 serveur configuré |
| Dispatcher MCP (parallèle, cache, audit, timeouts) | absent |
| Agents autonomes (auto-approved vs approval) | absent (tout est « proposé ») |
| Approval system + rollback 24 h + snapshots | absent |
| Simulation before/after (ML) | absent |
| Gravité cross-projet | absent |
| Forecasting 4 semaines (séries temporelles) | absent |
| Briefing proactif | absent (dashboard seulement) |

## Dépendances pour la suite (ordre réaliste)

1. **Connecteurs multiples + écritures** (Jira/Slack/…) — sans eux, un agent
   « autonome » n'a rien à exécuter et le forecasting n'a pas de signaux.
2. **Orchestration MCP** (dispatcher parallèle + cache + fallback + audit).
3. **Système d'actions + approbation + rollback** (une fois qu'il y a des
   écritures à encadrer).
4. **Features ML** (simulation, gravité, forecasting) — nécessitent des
   **données historiques** d'abord collectées.

> Les features ML (simulation/gravité/forecasting) demandent un historique réel
> de décisions et d'issues avant d'être fiables : le guide lui-même prévoit
> « 60 % → 85 % » d'exactitude sur plusieurs semaines de collecte.
