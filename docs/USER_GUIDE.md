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

## 2. Essayer sans compte (mode invité)

Pas envie de vous inscrire tout de suite ? Depuis la page d'accueil, cliquez sur
**« Essayer sans compte »** : vous accédez immédiatement à l'app en **mode
invité**, sans e-mail ni mot de passe.

- Vous pouvez créer **1 projet** et le synchroniser pour voir Aperio à l'œuvre.
- Un bandeau rappelle que votre travail n'est pas sauvegardé.
- Pour continuer (2ᵉ projet, sauvegarde durable), cliquez sur **« Créer mon
  compte »** : votre projet d'essai est **conservé** et rattaché à votre
  nouveau compte.

## 3. Créer un compte

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

## 4. Premiers pas (onboarding guidé)

Juste après l'inscription, un **assistant en 3 étapes** s'ouvre
(`/onboarding`), avec un indicateur de progression :

1. **Décrire le projet** — donnez-lui un nom clair (ex. « Refonte du site »).
2. **Connecter le dépôt** — saisissez `propriétaire/dépôt` (ex. `facebook/react`).
   Étape facultative : vous pourrez relier un dépôt plus tard.
3. **Lancer l'analyse** — Aperio collecte l'activité et fait travailler ses
   agents. Le traitement est **asynchrone** (il part en arrière-plan).

Vous pouvez quitter l'assistant à tout moment (**Plus tard**) et le relancer
depuis l'état vide du tableau de bord (**Démarrer en 3 étapes**).

## 5. Deux niveaux d'affichage : simple et expert

Un sélecteur **Simple / Expert** est présent dans l'en-tête ; votre choix est
enregistré sur votre compte.

- **Mode simple** (par défaut, pensé pour les chefs de projet) : le tableau de
  bord montre trois indicateurs — **Santé globale** (0–100), **Niveau de
  risque**, **Activité (7 j)** — et une liste **« À traiter aujourd'hui »**
  limitée à l'essentiel. Le vocabulaire est métier (« activité »,
  « point d'attention », « recommandation »…).
- **Mode expert** : affiche le briefing complet, les tendances détaillées, la
  simulation de gravité et les métriques brutes, avec le vocabulaire technique.

Le **moteur est le même** : seule la présentation change.

> **Besoin d'une définition ?** Les termes sont expliqués au survol (infobulles)
> et rassemblés dans le **Glossaire** (menu **Aide**, page `/glossaire`).

## 6. Comprendre le tableau de bord (expert)

- **Signaux** : séries temporelles brutes (commits/jour, PRs, issues).
- **Anomalies** : écarts significatifs par rapport à la ligne de base (détection
  robuste médiane + MAD). Chaque anomalie porte une **sévérité**.
- **Décisions** : ce que les agents recommandent. Chaque décision explique **en
  clair** ce qu'une approbation ou un rejet déclenche ; les actions sûres sont
  signalées (**Action sûre**) et restent **réversibles 24 h**. Vous pouvez
  **valider** 👍 ou **rejeter** 👎 — ce feedback entraîne les agents.

## 7. Planning & date de livraison

Depuis une fiche projet, le bouton **Planning** ouvre la vue de planification.

- **Jalons** : des étapes datées (échéance), éventuellement **dépendantes** les
  unes des autres. On y rattache des **tâches** portant une **estimation
  d'effort** (points) et un statut (à faire / en cours / terminé).
- **Date de livraison prévue** : calculée à partir de l'**effort restant** et du
  **rythme d'avancement** (la vélocité saisie dans l'onglet **Équipe**). Elle est
  donnée sous forme de **fourchette** (optimiste → attendu → pessimiste) ;
  l'incertitude **se resserre** à mesure que des tâches sont terminées.
- **Retard probable** : un jalon dont la fin projetée dépasse son échéance est
  marqué **« En retard probable »** et remonte dans **« À traiter aujourd'hui »**.
- **Chemin critique** (mode expert) : la chaîne de jalons la plus lourde, qui
  détermine la date de fin.

> Sans vélocité (aucune affectation d'équipe), la date n'est pas calculée : un
> message invite à renseigner l'équipe. Rien n'est inventé.

## 8. Méthodologie & registre des risques

Chaque projet a une **méthodologie** (sélecteur sur la fiche projet) :

| Méthodologie | Vocabulaire | Rapport |
| --- | --- | --- |
| **Kanban** (défaut) | étapes, cartes | Rapport de flux |
| **Scrum** | sprints, stories | Burndown / revue de sprint |
| **PRINCE2** | étapes (stages), lots de travail | Highlight Report |
| **SAFe** | PI, stories | Rapport de PI |

Le **moteur est le même** : seuls le vocabulaire (dans le planning) et le
format des rapports s'adaptent.

**Registre des risques** (bouton **Risques** sur la fiche projet) : chaque
risque porte une **probabilité (1–5)** et un **impact (1–5)** ; le **score**
(probabilité × impact) et le **niveau** (faible / moyen / élevé) sont calculés
automatiquement, et la liste est triée par gravité. On peut aussi **créer un
risque depuis une anomalie ouverte** en un clic. Les risques majeurs ouverts
apparaissent dans les rapports.

## 9. Synchronisation : que se passe-t-il ?

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

## 10. Notifications par e-mail

Si l'administrateur a configuré l'envoi d'e-mails (Resend), Aperio vous prévient :

- **Alerte d'anomalie** : un e-mail est envoyé au propriétaire du projet dès
  qu'une anomalie est détectée lors d'une synchronisation.
- **Résumé hebdomadaire** : un digest de l'activité de vos projets (anomalies,
  décisions des 7 derniers jours).
- **Réinitialisation / vérification** : liens « mot de passe oublié » et
  confirmation d'adresse.

Vous pouvez couper les notifications (`notifyByEmail`) via votre profil. Sans
fournisseur d'e-mail configuré, aucun e-mail n'est envoyé — l'app reste
pleinement utilisable.

## 11. Vos données & vos droits (RGPD)

Aperio applique la **minimisation** (pas d'email brut dans les signaux, IP
tronquées dans l'audit) et la **conservation limitée**.

| Droit | Comment |
| --- | --- |
| **Accès / portabilité** | Exportez toutes vos données en JSON : `GET /api/v1/gdpr/export` |
| **Rectification** | Modifiez votre profil : `PATCH /api/v1/auth/me` |
| **Effacement** | Supprimez votre compte et vos données : `DELETE /api/v1/gdpr/me` |

## 12. Questions fréquentes

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
