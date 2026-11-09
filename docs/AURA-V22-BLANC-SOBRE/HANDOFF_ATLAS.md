# HANDOFF — AURA V2.2 DESIGN_VALIDATED → ATLAS IMPLEMENTATION

- **Produit :** SUPERVISION-VISIOS — harmonisation globale de l'interface.
- **Révision visuelle validée :** AURA V2.2 « Blanc & sobre », validée le 9 novembre 2026 (« Voilà, c'est parfait »).
- **Référence contractuelle :** `DESIGN_CONTRACT.md`, `SUPERVISION_VISIOS_AURA_V22_BLANC_SOBRE.html`, captures `planning_v22.png`, `drawer_v22.png`, `ues_v22.png`.
- **Base technique :** **copie actuelle** du dossier Windows `C:\Users\koffi\Documents\PROJETS JS\SUPERVISION-VISIOS` (Lot 3 fusionné, builds Angular + backend réussis et correctif Angular TS2345 déjà appliqué). Demander une archive actualisée ou une copie de ce dossier avant toute intégration ; les ZIP historiques antérieurs ne contiennent pas nécessairement ce dernier correctif.
- **Objectif :** unifier la présentation des rubriques existantes et ramener le formulaire Planning en tiroir droit, tout en conservant la sélection d'enseignants avec recherche intégrée.
- **Fichiers/parties à inventorier :** shell Angular principal, styles globaux, Planning et formulaire séance, Enseignants, UE, Classes, Parcours, Utilisateurs, historique, supervision et pages complémentaires.
- **Intouchables :** structures Firestore, authentification, rôles, données, API, id métier enseignant, logique de planning, validations, conflits horaires, workflow de supervision, export/impression et routes existantes.
- **Stratégie :** sauvegarder puis modifier **une seule copie du projet principal** avec différentiel traçable ; privilégier les tokens et composants partagés ; pas d'écrasement total depuis une archive antérieure ; préserver les formulaires métier complets, même si le prototype les simplifie.
- **Critères d'acceptation :** correspondance visuelle V2.2, champs recherchables et accessibles, tiroir droit, aucune perte de fonction ; builds et tests automatiques réussis ; vérification manuelle des parcours critiques sur environnement de test ; retour d'état de chargement/erreur correct.
- **Qualité de livraison :** liste exacte des fichiers, changements et tests exécutés, compilation `FRONT`/`BACKEND`, tests existants Lot 3, captures réelles pour AURA, erreurs et risques résiduels, rollback possible.
- **Prochaine transition :** `IMPLEMENTATION` → `VISUAL_QA` (AURA) → `TECHNICAL_AUDIT` (SENTINEL) → `DONE` seulement sur preuves.


## Avenant obligatoire — sélection des UE

- Remplacer dans le formulaire Planning la paire ancienne **recherche + `<select>`** par une combobox blanche et sobre équivalente à la recherche enseignant validée.
- Rechercher par code/intitulé avec normalisation accent/casse ; afficher la valeur retenue et enregistrer **uniquement l'ID réel** dans `modalData.ue_id`.
- Maintenir la liste d'UE compatible avec la classe/parcours si un filtrage métier est déjà appliqué, la pré-sélection en édition et la distinction Cours / UE vs Activité hors cours.
- Étendre le composant aux autres champs de sélection d'UE ; ne pas remplacer les recherches libres qui ne sélectionnent pas d'entité.
- Tester clavier/souris, résultats vides, fermeture, sélection réellement conservée, sauvegarde/rechargement, droits et non-régression.
- Référence : avenant n° 8 de `DESIGN_CONTRACT.md`. Le prototype HTML V2.2 inclut déjà une combobox `combo-ue` utilisant `setupCombo(...,'ue')` ; elle illustre l'interaction, **pas** une intégration Angular.
