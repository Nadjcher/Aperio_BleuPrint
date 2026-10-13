# Guide d'utilisation — Aperio

Ce guide s'adresse aux **utilisateurs** d'Aperio (chefs de projet, leads, PMO).
Pour l'installation et l'exploitation, voir [`DEPLOY.md`](./DEPLOY.md).

## 1. Qu'est-ce qu'Aperio ?

Aperio est un outil de gestion de projet **prédictif**. Au lieu d'attendre qu'un
problème remonte, il surveille vos dépôts en continu, repère les **signaux
faibles** (chute d'activité, pics d'anomalies) et met au travail quatre agents :

| Agent | Rôle |
| --- | --- |
| **Monitor** | Observe les signaux et déclenche l'alerte |
| **Analyst** | Diagnostique la cause probable d'une anomalie |
| **Planner** | Propose un plan correctif |
| **Reporter** | Génère des rapports hebdo/mensuels |

Les agents **apprennent** de vos retours : valider ou rejeter une décision
ajuste leur niveau de confiance au fil du temps.

## 2. Créer un compte

1. Ouvrez l'application et cliquez sur **Créer mon compte**.
2. Renseignez email, nom et un mot de passe (**12 caractères minimum**, avec au
   moins une lettre et un chiffre).
3. Le **premier compte créé** sur une instance devient **administrateur**.

### Rôles

| Rôle | Peut… |
| --- | --- |
| `viewer` | consulter projets, signaux, décisions |
| `manager` | + créer des projets, lancer des synchronisations, donner du feedback |
| `admin` | + administration (premier inscrit) |

## 3. Premiers pas (onboarding)

Depuis la page **Projets**, suivez les trois étapes :

1. **Reliez un dépôt** — saisissez `owner/repo` (ex. `facebook/react`) et créez
   le projet. Un bouton *Pré-remplir un exemple* est disponible au premier usage.
2. **Lancez une synchronisation** — depuis la fiche projet, bouton
   **Synchroniser**. Aperio collecte commits, pull requests et issues, puis
   lance la détection et les agents. Le traitement est **asynchrone** : la
   synchro part en arrière-plan et la fiche se met à jour quand c'est prêt.
3. **Lisez les décisions** — anomalies détectées, plan correctif et rapports
   apparaissent sur la fiche.

## 4. Comprendre le tableau de bord

- **Signaux** : séries temporelles brutes (commits/jour, PRs, issues).
- **Anomalies** : écarts significatifs par rapport à la ligne de base (détection
  robuste médiane + MAD). Chaque anomalie porte une **sévérité**.
- **Décisions** : ce que les agents recommandent. Vous pouvez **valider** 👍 ou
  **rejeter** 👎 — ce feedback entraîne les agents.

## 5. Synchronisation : que se passe-t-il ?

1. Vous cliquez sur **Synchroniser** → l'API répond immédiatement avec un
   identifiant de tâche (`jobId`).
2. Un **worker** en arrière-plan collecte les données GitHub, détecte les
   anomalies et exécute les agents.
3. En cas d'échec transitoire (GitHub indisponible), la tâche est **réessayée
   automatiquement** avec un délai croissant, puis marquée en échec si elle
   n'aboutit pas.
4. La fiche projet affiche l'état : *en attente → en cours → terminé / échec*.

> Un jeton GitHub en lecture seule (`GITHUB_TOKEN`) augmente les quotas d'API
> et permet d'accéder aux dépôts privés. Côté hébergeur.

## 6. Vos données & vos droits (RGPD)

Aperio applique la **minimisation** (pas d'email brut dans les signaux, IP
tronquées dans l'audit) et la **conservation limitée**.

| Droit | Comment |
| --- | --- |
| **Accès / portabilité** | Exportez toutes vos données en JSON : `GET /api/v1/gdpr/export` |
| **Rectification** | Modifiez votre profil : `PATCH /api/v1/auth/me` |
| **Effacement** | Supprimez votre compte et vos données : `DELETE /api/v1/gdpr/me` |

## 7. Questions fréquentes

**Ma synchro reste « en cours » longtemps.**
Le dépôt est peut-être volumineux, ou GitHub limite le débit. Elle se terminera
ou basculera en échec après les tentatives automatiques.

**Je ne peux pas créer de projet.**
Votre rôle est `viewer`. Demandez à un administrateur de vous passer `manager`.

**Un agent se trompe.**
Rejetez sa décision : son niveau de confiance baisse et ses prochaines
recommandations s'ajustent.

**Combien de projets puis-je suivre ?**
L'instance tient sans difficulté plusieurs dizaines de projets ; la capacité se
règle en ajoutant des workers (voir [`LOADTEST.md`](./LOADTEST.md)).
