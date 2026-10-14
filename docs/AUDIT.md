# Audit technique — Aperio (Phase 0)

> Date : 2026-10-14. Audit **en lecture seule** : aucun comportement modifié à ce
> stade. Objectif : cartographier la dette avant le refactoring de fondation et
> les phases fonctionnelles. Constats à fort impact vérifiés manuellement (grep /
> lecture ciblée), les autres issus de l'analyse des 3 couches (backend, frontend,
> transverse).

## Verdict global

La base est **saine et disciplinée** : configuration 100 % centralisée et validée
(Zod), typage strict (0 `any`, 0 `@ts-ignore` côté backend comme frontend), format
d'erreur API unifié, ESM cohérent, secrets jamais en dur, migrations ordonnées.

La dette est surtout **architecturale et d'ergonomie de code**, pas de la dette
« sale » :
- backend : pas de couche d'accès données (TypeORM appelé directement dans les
  routes), un peu de logique métier et de duplication dans les routes ;
- frontend : pas de couche data/état commune (chaque page recharge et regère
  loading/erreur à la main), composants UI dupliqués, 2 pages trop longues ;
- transverse : `npm run lint` cassé partout (eslint référencé mais absent), et le
  **flux auth/RBAC n'a aucun test**.

Rien ici n'empêche de livrer ; mais traiter ces points **avant** la Phase 1 rend
le reste beaucoup plus simple et sûr (le mode simple/expert et les méthodologies
s'appuieront sur la couche data et le kit UI qu'on va mettre en place).

---

## 1. Bloquant (à traiter en priorité)

| # | Constat | Emplacement | Reco |
|---|---|---|---|
| B1 | **Flux auth/RBAC non testé** : seuls `password`/`crypto` ont des tests ; `authService`, `middleware/auth`, `middleware/rbac`, `routes/auth` — rien. Le cœur sécurité n'a aucun filet. | `services/authService.ts`, `middleware/{auth,rbac}.ts`, `routes/auth.ts` | Ajouter des tests (login/refresh/rotation, guest→upgrade, hiérarchie des rôles) **avant** de refactorer l'auth. |
| B2 | **Chiffrement de champ non câblé** : `encryptField`/`decryptField` ne sont appelés que dans leur test — **zéro usage applicatif** (vérifié), alors que `FIELD_ENCRYPTION_KEY` est une variable d'env **obligatoire**. Soit du chiffrement oublié sur des champs sensibles, soit une clé requise pour rien. | `utils/crypto.ts` (défini) ; `config/env.ts:30` (clé requise) | **À trancher avec toi** : quels champs doivent être chiffrés (ex. tokens de connecteur) ? Puis câbler, ou rendre la clé optionnelle. Ne rien supposer. |

> B2 touche la sécurité/RGPD — je ne modifie rien dessus sans ta décision.

---

## 2. Majeur (refactoring de fondation)

### Backend
| # | Constat | Emplacement | Reco |
|---|---|---|---|
| M1 | **Pas de couche repository** : `AppDataSource.getRepository(...)` appelé directement dans 8+ routes. Les routes connaissent TypeORM. | `routes/{signals,projects,decisions,forecast,anomalies,resources,jobs,reports}.ts` | Tout accès DB passe par les services (ou des repositories). Les routes n'importent plus TypeORM. |
| M2 | **Logique métier dans les routes** : handler `feedback` (crée entité + mute statut + save) ; règle « invité = 1 projet max » en route. | `routes/decisions.ts:79-101`, `routes/projects.ts:48-57` | Déplacer en service (`decisionService`, `projectService`). |
| M3 | **Duplication `ownedProject`** (vérif de propriété de projet) répétée, avec un ordre d'arguments **incohérent** entre fichiers → piège. | `routes/signals.ts:16`, `reports.ts:17`, `resources.ts:26` + variantes inline (`projects`, `forecast`, `decisions`, `jobs`) | Un seul middleware/helper `requireProjectOwnership`. |
| M4 | **Mapping `Decision → DTO` dupliqué byte-à-byte**. | `agents/orchestrator.ts:22-40` et `routes/decisions.ts:37-55` | Factoriser `decisionToDTO` dans un module partagé. |
| M5 | **`authService.ts` (309 l.) fait tout** : JWT, refresh, one-time tokens, hash, e-mails, CRUD user, invité, reset, vérif e-mail, profil (13 exports). | `services/authService.ts` | Scinder : `tokenService` / `emailVerificationService` / `userService`. |
| M6 | **`AppError` dans `middleware/`** mais importé par 7 modules métier → une couche domaine dépend de la couche HTTP. | `middleware/errorHandler.ts` → importé par services/agents/connectors | Déplacer `AppError` dans `src/errors` (neutre). |
| M7 | **`down()` du schéma initial non réversible** : `DROP TABLE` exécuté **avant** le `DROP INDEX` de la même table → le DROP INDEX échoue (index déjà supprimé par la table). Rollback complet plante. | `migrations/1739200000000-InitialSchema.ts:34-55` | Droper les index avant les tables, ou retirer les DROP INDEX redondants (la table emporte ses index). |

### Frontend
| # | Constat | Emplacement | Reco |
|---|---|---|---|
| M8 | **Pas de couche data/loading/erreur** : chaque page recopie `useState error` + `try/catch` + `err instanceof RequestError ? err.message : "Erreur"`. Loading absent sur certaines pages (`ProjectsPage`, `TeamPage`), présent sur d'autres. | `ProjectsPage.tsx`, `TeamPage.tsx:42,61`, `ProjectDetailPage.tsx:107+` | Hook `useAsync`/`useApi` (données+loading+erreur) + `toErrorMessage(err)`. |
| M9 | **Données serveur dupliquées en local** : `/projects` fetché 3× indépendamment (`ProjectsPage`, `TeamPage`, `DashboardPage`), aucun cache ; `ProjectDetailPage` recharge tout après chaque action. | idem | Cache léger (slice ou RTK Query) + invalidation ciblée. |
| M10 | **Kit UI inexistant** : `PageHeader`, `Spinner`, `ErrorBanner`, `EmptyState`, logo/header, boutons d'action réécrits dans chaque page (3 variantes de « Chargement… », 3 d'ErrorBanner, logo dupliqué ~5×). | pages + `Layout.tsx`, `LandingPage.tsx`, `LegalPages.tsx` | Extraire un petit kit partagé. |
| M11 | **2 pages > 500 lignes** mélangeant plusieurs responsabilités. | `ProjectDetailPage.tsx` (516), `TeamPage.tsx` (505) | Éclater en sous-composants + hooks. |
| M12 | **A11y formulaires** : labels non associés (0 `htmlFor`), onglets Connexion/Inscription sans `role="tab"`/focus, contrastes `text-slate-400/500` douteux sur fond sombre. | `LoginPage.tsx:72+`, `AuthPages.tsx:59+`, `index.css` (`.pm-label`) | Associer labels, rôles ARIA, relever les contrastes (objectif WCAG AA — Phase 1/5). |

### Transverse
| # | Constat | Emplacement | Reco |
|---|---|---|---|
| M13 | **`npm run lint` cassé partout** : eslint référencé dans les scripts mais **ni installé ni configuré** (vérifié : absent, aucune config). Pas de prettier. | `backend/package.json:13`, `frontend/package.json:10` | Installer + configurer eslint (typescript-eslint) + prettier, ou retirer les scripts. À faire tôt (garde-fou). |
| M14 | **15 routes HTTP sans aucun test d'intégration** ; `decisionService`, `gdprService`, `jobService`/worker non testés. | `routes/*`, services cités | Ajouter des tests d'intégration (supertest) sur les parcours critiques (Phase 5, mais commencer par B1). |

---

## 3. Mineur (à ramasser au passage)

- **TTL refresh en dur** : `JWT_REFRESH_TTL` défini en env mais **jamais lu** ; `ttlDays=7` codé en dur. `authService.ts:92,111`.
- **`req.user!`** (~49 occurrences) : non-null assertions fragiles. Introduire un type `AuthedRequest`.
- **Pagination fictive** : `routes/projects.ts:39` renvoie `page:1,pageSize=rows.length` ; `take:100` en dur (`signals`, `decisions`).
- **Bloc `audit({...})` répété** sur 18 sites → helper `auditFromReq(req, action, target)`.
- **Exports/métriques morts** : `isEmailEnabled()` jamais utilisé ; gauge Prometheus `jobsByStatus` jamais alimentée.
- **Types API côté front** : `EnqueueResult`/`SyncJobResult` définis dans `ProjectDetailPage.tsx` au lieu de `shared`.
- **Config** : `shared` sans scripts `test`/`lint` (masqué par `--if-present`) ; `backend` `noUnusedParameters:false` divergent du reste ; `vitest` en devDep frontend sans aucun test.
- **Routing** : pas de lazy-loading (tout le bundle d'un coup) ; pas de breadcrumb sur `/projects/:id`.
- **Nommage incohérent** : « Aperio » (docs, `JWT_ISSUER`) vs « projectmaster » (packages) — rebranding partiel.
- **`authSlice.ts:18`** : ternaire mort `tokenStore.access ? "idle" : "idle"`.

---

## 4. Découpage cible (architecture)

Objectif : une frontière nette **domaine → service → accès données**, et côté front
une **couche data + kit UI** réutilisables par les deux modes (simple/expert).

```
backend/src/
  errors/            ← AppError + codes (neutre, ne dépend de rien) [M6]
  config/            ← env.ts (inchangé, déjà bon)
  domain/ (optionnel) ← fonctions pures métier (ex. analyzeResourceMove) [M5/resource]
  services/          ← SEUL endroit qui touche la DB (via repositories ou DataSource)
  routes/            ← validation (zod) + appel service + mapping DTO. Zéro TypeORM. [M1]
  middleware/        ← auth, rbac, requireProjectOwnership [M3], validate
  agents/            ← dépendent des services, jamais l'inverse [M-couplage]

frontend/src/
  api/               ← client.ts (bon) + toErrorMessage
  hooks/             ← useAsync / useApi (données+loading+erreur) [M8]
  components/ui/     ← PageHeader, Spinner, ErrorBanner, EmptyState, Logo, ActionButton [M10]
  store/ (ou RTK Query) ← cache des données serveur partagées [M9]
  pages/             ← composition, pages courtes [M11]
```

Sens de dépendance unique : `routes → services → (repositories) → DB` ; `agents →
services`. Aucune couche métier n'importe `middleware/`.

---

## 5. Plan de refactoring Phase 0 (petits lots, 0 changement visible)

> **État : réalisé** (7 commits `lot0`→`lot6b`, 47 tests verts, lint/build OK,
> aucun changement de comportement). Détail par lot ci-dessous.

Chaque lot = 1 commit, tests verts avant/après. Ordre proposé (du plus sûr au plus
structurant) :

1. ✅ **Lot 0 — garde-fous** : eslint 9 + prettier configurés, `npm run lint` réparé
   [M13] ; `down()` du schéma initial corrigé [M7] ; ternaire + export morts nettoyés.
2. ✅ **Lot 1 — erreurs** : `AppError` déplacé dans `src/errors` [M6] (ré-export
   compat), `toErrorMessage` côté front.
3. ✅ **Lot 2 — propriété projet** : `projectService.getOwnedProject(OrNull)` ;
   `ownedProject` dupliqués supprimés, ordre d'args unifié [M3].
4. ✅ **Lot 3 — DTO & logique en service** : `decisionToDTO`/`loadOwnedDecision`/
   `submitFeedback`/`listDecisions` [M4][M2] ; `createProject` + règle invité en
   service ; routes `decisions`/`projects` ne touchent plus TypeORM.
5. ✅ **Lot 4 — kit UI front** : `PageHeader`, `Loading`, `ErrorBanner`, `EmptyState`
   [M10], branchés dans Dashboard/Projets/Équipe.
6. ✅ **Lot 5 — hook data** : `useAsync` [M8] + contexte `ProjectsProvider` (fetch
   unique de `/projects`) [M9] ; pages migrées.
7. ✅ **Lot 6 — découpe + auth** : `tokenService` extrait d'`authService` [M5] +
   `verifyAccess` centralisé ; **tests auth/RBAC ajoutés** [B1] ;
   `ProjectDetailPage` 516→200 et `TeamPage` 505→403 lignes [M11].

### Reste à traiter hors Phase 0 (planifié)

- **M14** — tests d'intégration des 15 routes HTTP (decisions/gdpr/jobs) → Phase 5.
- **M12** — a11y complète (labels associés, rôles tabs, contrastes AA) → Phase 1/5.
- **B2** — chiffrement de champ : laissé tel quel (décision), à câbler en Phase 4.
- Mineurs non repris : TTL refresh en dur, `req.user!` → `AuthedRequest`, pagination
  fictive, gauge Prometheus morte, nommage Aperio/projectmaster.

> Les tests d'intégration des routes [M14] et l'a11y complète [M12] relèvent plutôt
> des Phases 1/5 ; on pose B1 (tests auth) dès le Lot 6 car il conditionne la
> découpe de `authService`.

---

## 6. Questions ouvertes (à trancher)

- **B2 — chiffrement de champ** : quels champs sensibles chiffrer (ex. tokens de
  connecteurs quand on les stockera), ou rend-on `FIELD_ENCRYPTION_KEY` optionnelle
  en attendant ? *Impact sécurité/RGPD — décision requise.*
- **Portée Phase 0** : fait-on **tout** le refactoring de fondation avant la Phase 1,
  ou seulement les Lots 0–3 (les plus sûrs) puis on enchaîne la Phase 1 et on
  ramasse les Lots 4–6 au fil de la refonte UI ? *(Je recommande la 2e option : les
  Lots 4–6 touchent justement l'UI qu'on va refaire en Phase 1.)*
