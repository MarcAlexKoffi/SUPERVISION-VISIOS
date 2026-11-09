# ATLAS — Intégration AURA V2 Premium dans SUPERVISION-VISIOS

- **Base** : `SUPERVISION-VISIOS_LOT3_CANDIDAT.zip` (conservée intacte pour le retour arrière)
- **Référence validée** : `AURA-V2-PREMIUM-2026-11-08` — `docs/AURA-V2-PREMIUM/DESIGN_CONTRACT.md`
- **Périmètre** : SV-L3-UI-01 (présentation) + SV-L3-UI-02 (recherche enseignants)
- **Version livrée** : **candidate à tester localement** ; ne pas déployer en production.
- **Workflow** : `DESIGN_VALIDATED` → `IMPLEMENTATION` (code intégré) → `VISUAL_QA` **à réaliser sur l'application Angular**. Pas `DONE`.

## Modifications et correspondance AURA → Angular

| Écran / fonction AURA | Route existante | Fichiers intégrés | Comportement préservé |
|---|---|---|---|
| Shell UDMCI / navigation / fil d'Ariane | `/admin/plannings`, `/admin/teachers` | `FRONT/src/app/admindashboard/admindashboard.html`, `.scss`, `.ts` | Même menu, rôles, notifications, routes, déconnexion ; styles scoppés aux deux pages. |
| Titre, trois actions, bande KPI, trois vues, filtres, vue par journée | `/admin/plannings` | `FRONT/src/app/plannings/plannings.html`, `.scss`, `.ts` | Création/édition/suppression, changement de statut, activités, supervision liée, lien visio, export PDF, impression, calendrier horaire original. |
| Recherches enseignants autonomes (vue et formulaire) | `/admin/plannings` | `plannings.ts`, `plannings.html`, `shared/utils/academic-search.ts` | La sélection par ID reste inchangée tant qu'aucun autre enseignant n'est choisi ; recherche insensible aux accents, saisies indépendantes. |
| Répertoire Enseignants moderne | `/admin/teachers` | `FRONT/src/app/teachers/teachers.html`, `.ts`, `.scss` | Colonnes originales, tri, pagination, statut, parcours, ajout/édition/suppression et confirmation conservés. |
| Police premium | deux pages seulement | `FRONT/src/index.html` | Manrope via Google Fonts ; repli sur polices existantes si hors ligne. |

### Décisions d'intégration

- Le contenu de la maquette est fictif. L'application continue d'utiliser les vrais services Angular/Firebase. Aucune donnée de démonstration n'est intégrée au code Angular.
- Les panneaux visibles ne changent pas les références de séances, ni leurs relations à Firestore.
- « Toutes les classes » est désormais la valeur initiale du filtre planning (conforme à la V2 validée) ; le choix précis d'une classe est toujours obligatoire à la création. La sélection du champ « Classe » dans la modale renseigne bien le champ historique `parcours` et les identifiants académiques.
- Les quatre KPI se recalculent sur les données chargées et les filtres actifs ; ils ne sont pas des nombres fictifs.
- Les journées sans séance sont compactées en vue Superviseur ; les sept colonnes restent visibles dans la vue Calendrier (horaires/durées inchangés).
- Le rendu premium est appliqué au shell uniquement sur Planning et Enseignants, pour ne pas modifier silencieusement les autres pages.

## Contrôles effectués le 8 novembre 2026

| Contrôle | Résultat | Preuve / limite |
|---|---|---|
| Tests métier FRONT (5) | **Exécuté — réussi** | `node --test src/app/services/planning-rules.test.cjs` après compilation TypeScript isolée (types du projet exclus) |
| Tests métier BACKEND (4) | **Exécuté — réussi** | `node --test src/utils/planningLot3.test.cjs` après compilation TypeScript isolée |
| Tests de normalisation/recherche (3) | **Exécuté — réussi** | `node --test src/app/shared/utils/academic-search.test.cjs` |
| Analyse syntaxique TypeScript des 4 fichiers modifiés | **Exécuté — réussi** | TypeScript `transpileModule` (ce contrôle ne vérifie pas les imports ni les types Angular) |
| Analyse structurelle HTML des 3 templates | **Exécuté — réussi** | Équilibre balises HTML, contrôle des handlers essentiels |
| `npm ci` FRONT | **Bloqué** | DNS `EAI_AGAIN` vers `registry.npmjs.org`, dépendances non téléchargées |
| `npm run build` FRONT/BACKEND | **Non exécuté** | Dépendances Angular/backend indisponibles dans cet environnement |
| QA visuelle Angular, 320/390/768/1024/1440 px | **Non exécuté sur code réel** | Nécessite de lancer l'application et configurer un Firebase de test ; prototype HTML déjà testé mais ne prouve pas le rendu Angular |
| Firestore, droits, export PDF et concurrence | **Non exécuté** | Nécessite environnement de préproduction et données fictives |

Les mêmes 9 tests métier qui passaient dans le candidat Lot 3 passent encore, mais le produit entier **n'a pas encore été compilé ni testé en interface réelle**. Les nouveaux contrôles de recherche portent sur un utilitaire pur partagé ; ils ne remplacent pas un test utilisateur de sélecteur.

## Installation et tests sous Windows 11

1. Conserver le projet précédent et **décompresser ce ZIP dans un nouveau dossier**, par exemple `SUPERVISION-VISIOS-L3-AURA-V2` ; n'écraser ni dossier, ni base Firebase.
2. Prérequis : Node compatible Angular 20 (`node -v`, `npm -v`).
3. Ouvrir PowerShell :

```powershell
cd "C:\chemin\vers\SUPERVISION-VISIOS-L3-AURA-V2\FRONT"
npm ci
npm run build

cd ..\BACKEND
npm ci
npm run build

cd ..
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tests\run-aura-v2-tests.ps1"
```

4. Réaliser les essais uniquement avec un **projet Firebase de préproduction**, des comptes et des données fictives ; la configuration d'origine n'est pas un environnement de test automatiquement sûr. Ne pas déployer les règles Firestore : les règles incluses dans la base autorisent toutes les lectures/écritures ; un audit séparé est indispensable.
5. Quand les compilations passent, démarrer le FRONT :

```powershell
cd FRONT
npm start
```

6. Ouvrir `http://localhost:4200` et tester `/admin/plannings`, puis `/admin/teachers` avec un compte de test.

## Scénarios de vérification manuelle prioritaires

1. **Parité visuelle** : comparer l'écran Superviseur avec la capture validée dans `docs/AURA-V2-PREMIUM/`. Police Manrope, bande KPI, groupe des onglets et des semaines, filtres, liste compacte, navigation et alignements doivent correspondre. Vérifier 1440, 1024, 768, 390 et 320 px ainsi qu'un zoom à 200 %.
2. **Filtres Planning** : recherche par nom d'UE/enseignant (accents et casse), classe, statut, effacement, semaine précédente/suivante/Aujourd'hui. Tester les résultats vides.
3. **Enseignant dans le planning** : recherche d'un enseignant, sélection, recherche d'un autre sans remplacer le premier avant clic, changement de semaine, filtre classe, export PDF.
4. **Formulaire séance** : recherche indépendante de l'enseignant, choix de la classe et de l'UE, création, édition et activité hors cours, puis validation des conflits horaires ; vérifier qu'une saisie partielle dans la recherche ne perd pas `teacher_id`.
5. **Actions** : changer statut, annuler, reporter, ouvrir la fiche de supervision liée, supprimer après confirmation, ouvrir lien visio et vérifier le contenu PDF et l'impression.
6. **Enseignants** : recherche, filtres parcours/statut, tri au clavier, pagination, ajout, modification, suppression après confirmation, états vides et longs noms.
7. **Rôles & sécurité** : vérifier les autorisations réelles avec plusieurs comptes de test ; toute faille Firestore doit être traitée avant production.

## Limites et relais

Aucun déploiement ni migration n'a été effectué. La base Firebase n'a pas été modifiée. Le backend est identique à celui du Lot 3 candidat.

**AURA — VISUAL_QA (prochaine étape)** : comparaison de l'application Angular exécutée avec `docs/AURA-V2-PREMIUM/REFERENCE_VISUELLE_AURA_V2_PREMIUM.png`, relève des écarts. Si des erreurs de compilation ou d'interface apparaissent, retour ATLAS pour correctif précis. Ensuite seulement, audit final SENTINEL. Pas de statut DONE sans preuves.

**Retour arrière** : fermer la version candidate, restaurer le dossier d'origine `SUPERVISION-VISIOS_LOT3_CANDIDAT.zip`. Aucun schéma ni donnée n'a été modifié durant l'intégration AURA ; ne pas utiliser l'archive comme sauvegarde de la base Firestore.
