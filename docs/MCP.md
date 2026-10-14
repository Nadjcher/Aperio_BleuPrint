# MCP — orchestration (côté client)

Aperio peut appeler des **serveurs MCP distants** de deux façons :

1. **Connecteur MCP de l'API Claude** (le *modèle* appelle les outils) — utilisé
   par le Planner quand `LLM_PROVIDER=anthropic` (voir `llm/providers/anthropic.ts`).
2. **Dispatcher côté client** (*nous* appelons les outils) — brique d'orchestration
   sous notre contrôle : parallélisation, cache, timeout, fallback, audit.

Ce document décrit le **dispatcher** (`backend/src/mcp/`).

## Architecture

```
backend/src/mcp/
├─ types.ts        # McpServer, McpCallRequest/Outcome, interface McpCaller
├─ cache.ts        # cache mémoire à TTL (clé stable server::tool::args)
├─ client.ts       # realCaller : SDK MCP officiel (Streamable HTTP)
└─ dispatcher.ts   # dispatch() parallèle + cache + timeout + audit + probe
```

- **Parallélisation** : `dispatch(requests)` lance tous les appels en parallèle.
- **Timeout par appel** : `MCP_TIMEOUT_MS` (30 s par défaut), appliqué par le SDK.
- **Cache** : `MCP_CACHE_TTL_MS` (1 h). Un 2ᵉ appel identique renvoie `status:"cache"`
  sans toucher le serveur. (En mémoire process ; remplaçable par Redis.)
- **Fallback sûr** : un appel ne lève **jamais** d'exception ni ne fait échouer
  les autres — chaque résultat porte son `status` (`ok|error|timeout|cache`).
- **Audit** : chaque appel est tracé dans la table `mcp_calls`
  (serveur, outil, statut, latence, erreur, date).

L'abstraction `McpCaller` permet d'injecter un faux client en test ; en prod
`realCaller` utilise le SDK officiel `@modelcontextprotocol/sdk`.

## Configuration

```bash
# Liste JSON de serveurs MCP DISTANTS (hébergés, accessibles par URL) :
MCP_SERVERS=[{"name":"github","url":"https://mcp.exemple.com/github","token":"…"}]
MCP_TIMEOUT_MS=30000
MCP_CACHE_TTL_MS=3600000
```

## Vérifier le câblage

`GET /api/v1/mcp/status` (admin) renvoie les serveurs configurés et une **sonde
de santé** (listTools) en parallèle avec latence :

```json
{ "configured": ["github"], "health": [{ "server": "github", "ok": true, "toolCount": 12, "latencyMs": 180 }] }
```

## État et suite

- ✅ Dispatcher parallèle + cache + timeout + fallback + audit — testé
  (`mcp/dispatcher.test.ts` : parallélisme, erreur, timeout, cache).
- ✅ Chemin réseau réel validé contre un serveur MCP mock (`listTools` + `callTool`).
- ⏭️ **À venir** : brancher des appels d'outils spécifiques dans les agents
  (ex. Monitor → `get_test_coverage`, Analyst → `search_docs`) une fois les
  serveurs MCP réels et leurs schémas d'outils connus.
