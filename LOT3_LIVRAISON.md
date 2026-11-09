# SUPERVISION-VISIOS — Lot 3 (SV-L3-01 a SV-L3-07)

## Version
Candidat de livraison integree construit a partir de l'archive `SUPERVISION-VISIOS-lot3.zip` transmise le 8 novembre 2026.
**Statut : IMPLEMENTATION / VISUAL_QA et TECHNICAL_AUDIT non clos. NE PAS deployer directement en production.**

## Contenu fonctionnel
- **SV-L3-01** : toute nouvelle/modifiee seance conserve la classe lisible (`parcours` historique) et ajoute `classe_id`, `classe_name`, `parcours_id`, `ue_id`, `teacher_id` et les noms denormalises. Le choix de classe au formulaire utilise l'ID Firestore; aucune migration destructive.
- **SV-L3-02** : verification date ISO, heures `debut < fin`, detection des chevauchements pour un enseignant OU une classe, exclusion des seances annulees et des mises a jour de la meme seance; garde-jour transactionnel `planning_day_locks/{date}` partage entre frontend et backend REST. Deux creneaux jointifs sont acceptes.
- **SV-L3-03** : historisation `reschedule_history` et `status_history` des changements d'heures, date et statut. Annulation liberant les plages pour la detection des conflits. Suppression interdite en presence de fiche de supervision liee.
- **SV-L3-04** : action « Fiche de supervision » depuis le planning; document supervision lie par `planning_id`, planning par `supervision_id`; creation atomique pour eviter les doublons. Suppression d'une fiche liee restaure le planning.
- **SV-L3-05** : pre-remplissage de la fiche par `planningId` (UE, enseignant, classe, date, heures, plateforme) en maintenant les champs d'evaluation et les signatures lors d'une modification. Detection d'une reprogrammation pendant la saisie.
- **SV-L3-06** : vue « Enseignant » avec semaine, choix d'enseignant, ordre chronologique, classe, UE, statut et actions, derivee des memes seances que les vues existantes.
- **SV-L3-07** : PDF de l'emploi du temps enseignant; PDF de classe/calendrier anterieur conserve.

## Fichiers modifies et ajoutes
- `FRONT/src/app/services/planning.service.ts` (CRUD transactionnel, references et traces)
- `FRONT/src/app/services/planning-rules.ts` (ajout, regles testables)
- `FRONT/src/app/services/planning-rules.test.cjs` (ajout, 5 tests)
- `FRONT/src/app/plannings/plannings.ts` et `plannings.html` (vue, recherches, navigation, messages d'erreur)
- `FRONT/src/app/services/supervision.service.ts` (liaison atomique et suppression coherente)
- `FRONT/src/app/supervision-form/supervision-form.ts` et `supervision-form.html` (pre-remplissage et edition preservee)
- `BACKEND/src/utils/planningLot3.ts` (ajout, regles backend)
- `BACKEND/src/utils/planningLot3.test.cjs` (ajout, 4 tests)
- `BACKEND/src/controllers/planningController.ts` et `supervisionController.ts` (parite REST)
- `tests/run-lot3-tests.ps1` (ajout)
- `.gitignore` (ignore les sorties temporaires des tests)

## Verification executee dans l'environnement de preparation
| Controle | Statut | Preuve |
| --- | --- | --- |
| Syntaxe de tous les fichiers TypeScript frontend et backend | Execute - reussi | `typescript.transpileModule` : 0 diagnostic syntaxique |
| Tests unitaires purs frontend | Execute - reussi | 5/5 tests via Node test runner |
| Tests unitaires purs backend | Execute - reussi | 4/4 tests via Node test runner |
| Compilation Angular complete | Bloque | `npm ci --offline` manque un tarball et `npm ci` en ligne a expire; node_modules incomplets |
| Compilation backend TypeScript complete | Non execute | Dependances Node absentes dans la copie initiale |
| Test Firestore et multi-utilisateur | Non execute | Aucun acces autorise a une base ou a l'emulateur |
| Controle visuel AURA / E2E navigateur | Non execute | Pas de session navigateur sur l'application executee |
| Audit securite deploiement | Partiel | Controle statique, voir `LOT3_SECURITE_ET_TESTS.md` |

## Installation Windows, sans ecraser l'existant
1. **Sauvegarder** votre projet original et exporter vos donnees Firestore avant toute operation.
2. Decompresser cet archive dans un **nouveau** dossier, par exemple `SUPERVISION-VISIOS-L3-CANDIDAT`.
3. Dans PowerShell (Node compatible Angular 20 / Node 20.19+ ou 22.x), executer :

```powershell
cd "C:\chemin\vers\SUPERVISION-VISIOS-L3-CANDIDAT\FRONT"
npm ci
npm run build
cd ..\BACKEND
npm ci
npm run build
cd ..
.\tests\run-lot3-tests.ps1
```
4. Pour tester le frontend localement :

```powershell
cd FRONT
npm start
```

5. Utiliser **un projet Firebase de preproduction**, des comptes de test et des donnees fictives. Les valeurs `firebase` / `apiUrl` presentes dans les fichiers `FRONT/src/environments` proviennent de la copie d'origine et doivent etre reconfigurees pour cette preproduction avant les essais.
6. Ne pas deployer de regles, ne pas executer de migration et ne pas modifier les donnees de production avant revue des droits et validation explicite.
7. Corriger tout echec de build; ne pas marquer DONE sur la seule base des tests purs.

## Donnees et migrations
Aucune migration automatique de la collection `plannings` n'a ete executee. Les documents historiques sans `classe_id`, `parcours_id` ou `supervision_id` restent lisibles via le champ `parcours`. Les nouvelles references sont renseignees a l'enregistrement; elles ne sont pas reconstruites massivement. Les collections `planning_day_locks` sont creees par les operations compatibles Lot 3 et ne doivent pas etre modifiees directement.

## Retour arriere
Le ZIP original reste la reference. Pour revenir sur le code, arreter la version candidate puis restaurer le dossier original. Pour les donnees, une restauration de sauvegarde Firestore ou une migration inverse auditee est necessaire : le seul retour au code anterieur ne supprime pas les champs ajoutes ni les verrous de jour. Faire une sauvegarde avant tout test reel.

## Criteres de sortie avant DONE
- `npm run build` FRONT et BACKEND reussissent sans contournement.
- Essais Firestore sur donnees fictives : creation, modification, chevauchement, annulation, reprogrammation et course multi-utilisateurs.
- Controle de navigation et de pre-remplissage dans un navigateur, y compris petits ecrans.
- Controle de fidelite AURA et approbation explicite de l'interface si nouvelle vue.
- Regles Firestore securisees et controlees : **la regle fournie dans l'archive d'origine autorise toute lecture et toute ecriture**.
- Validation du PDF, des historiques, et des acces roles sur la preproduction.

## Hors perimetre
Honoraires, emails automatiques, migration distante, deploiement production, redesign global et autres lots restent exclus.
