# DESIGN_CONTRACT — SUPERVISION-VISIOS — AURA V2.2 « Blanc & sobre »

**Statut : DESIGN_VALIDATED**  
**Date de validation : 9 novembre 2026**  
**Validation humaine :** l'utilisateur a répondu « Voilà, c'est parfait » après visualisation de la maquette V2.2 blanche et sobre.  
**Révision de référence :** V2.2, remplace V2.1 comme source de vérité **stylistique**. La disposition V2.1 précédemment validée reste contractuelle.  
**Source principale :** `SUPERVISION_VISIOS_AURA_V22_BLANC_SOBRE.html` (prototype autonome).  
**Aperçus :** `planning_v22.png`, `drawer_v22.png`, `ues_v22.png`.

## 1. Portée et éléments intouchables

Le périmètre est l'**harmonisation globale des écrans existants** avec une identité blanche, sobre et institutionnelle, **sans modification des règles métier, flux de données, permissions, routes, nomenclature, fonctionnalités et contrats API**.

- Conserver la hiérarchie et la disposition V2.1 (titre, bande d'indicateurs, onglets, filtres, semaine et actions), sans déplacer ni supprimer les commandes approuvées.
- Maintenir les trois vues Planning (Superviseur, Calendrier, Enseignant), la création et la modification de séance, les deux modes **Cours / UE** et **Activité hors cours**, le changement de statut, les annulations/reports, la fiche de supervision, les exports PDF et l'impression.
- Conserver les autres rubriques et leurs parcours existants : Tableau de bord, Visio, Forum, Enseignants, UE, Parcours, Classes, Utilisateurs, Historique, fiches, ainsi que tout écran non illustré dans le prototype.
- Ne pas modifier les relations Enseignant/UE/Classe, leurs identifiants, les restrictions de rôles, les règles Firestore ni les structures de données par une simple refonte visuelle.
- **Source du code :** la version réelle fusionnée et compilée sur le poste Windows de l'utilisateur, avec le correctif d'événements Angular. Les archives anciennes ne doivent pas écraser cette version.

## 2. Tokens visuels de référence

| Catégorie | Valeur/consigne |
| --- | --- |
| Police | `Manrope`, alternatives `Inter`, `Segoe UI`, `Arial`, sans-serif ; contrôler la disponibilité effective en production |
| Fond application | `#F8FAFC` |
| Panneaux, sidebar, topbar, inputs | `#FFFFFF` |
| Bleu primaire | `#1649AB` |
| Bleu hover | `#103C91` |
| Bleu sélection | `#EFF3FF` |
| Texte principal | `#152744` |
| Texte secondaire | `#415574` |
| Texte d'aide | `#7587A0` |
| Bordures | `#E4EAF2` ; secondaires `#EDF1F6` |
| Ombre de surface | `0 3px 15px rgba(25,49,87,.035)` |
| Rayon principal | env. `15px` ; champs/boutons env. `10px` |
| Focus | bordure bleue visible et anneau de focus ; ne pas masquer au clavier |
| Statuts | utiliser couleur **et** libellé, pas uniquement la couleur |

Les valeurs peuvent être adaptées à l'échelle existante (variables CSS/tokens) uniquement pour reproduire le rendu et préserver l'accessibilité ; tout écart visuel notable doit être documenté et soumis à AURA.

## 3. Composants et dispositions validés

**Shell global.** Barre latérale blanche, zone de navigation active bleu très clair, topbar blanche, titres non redondants, zones de contenu sur fond clair, même police, même espacement et mêmes comportements de responsive dans toutes les rubriques. Aucun effet de dégradé ou d'ombre décorative excessive.

**Planning.** Indicateurs en bande compacte ; onglets Superviseur / Calendrier / Enseignant avec état actif explicite ; filtres regroupés selon l'organisation V2.1 ; période/semaine et actions PDF/Imprimer/Ajouter conservées. Cartes et tableaux sur fond blanc, séparateurs discrets. La disposition ne doit pas être réinventée.

**Sélecteur enseignant recherchable.** Contrôle de type combobox avec saisie intégrée, liste filtrée par nom/attributs métier, sélection visible, état vide, navigation clavier, fermeture correcte au clic extérieur et focus. **Toujours conserver la vraie référence ID métier**, jamais le texte saisi comme identifiant. Maintenir les recherches indépendantes entre vues/formulaires.

**Formulaire Ajouter une séance.** Tiroir **à droite** sur desktop, largeur de référence ~494 px dans le prototype courant (adapter sans débordement au contenu et au viewport). Entête et pied fixes, corps défilant, actions Annuler/Enregistrer, fermeture X et Échap lorsque adaptée. Sur mobile, panneau pleine largeur ou largeur viewport. Conserver intégralement champs, validation et logique de sauvegarde réels ; le prototype peut omettre des champs que l'app réelle possède.

**Pages transverses.** Aligner Enseignants, UE, Classes, Parcours, Utilisateurs, Historique, supervision, etc. sur les mêmes champs, titres, tableaux, boutons, badges, états vides, chargement et erreurs. Ne pas copier des données fictives du prototype en production.

## 4. États et interactions

- Default / hover / active / focus / disabled / loading / empty / error / success pour champs, recherches, tableaux et actions.
- Boutons explicites ; retours utilisateur lorsqu'une opération est en attente, réussit ou échoue.
- Focus clavier visible, labels reliés, tabulation logique, sélection recherchable clavier/souris, modale sans piège de focus involontaire.
- Défilement : éviter les scrolls concurrents inutiles ; pour le tiroir, seul le corps doit défiler et le pied doit rester accessible.
- Responsive : vérifier au minimum 320, 390, 768, 1024, 1440 CSS px ; vérifier le zoom et les contenus longs.
- Respect de `prefers-reduced-motion`.

## 5. Méthode de comparaison AURA

1. Exécuter l'application réelle sur un environnement de test avec des données non sensibles et l'authentification de rôles représentatifs.
2. Comparer à taille de viewport égale et sur les mêmes rubriques le prototype HTML V2.2 et le rendu Angular (Planning, fiche d'ajout ouverte, Enseignants, UE, puis pages transverses).
3. Vérifier typographie, densité, alignement, largeur des champs, états actifs, navigation, scroll, responsive et cohérence inter-pages.
4. Qualifier chaque écart : conforme, mineur, majeur, bloquant, ou écart accepté ; transmettre à ATLAS les corrections bornées.
5. Exécuter indépendamment les tests de non-régression des flux métier (création/modification/sauvegarde, filtres, rôles, exports et supervisions). Un prototype correct ou un build réussi ne vaut pas validation fonctionnelle.

## 6. Limites des preuves

Les contrôles navigateur de la maquette simulée sont documentés dans `AURA_V22_REVUE_VISUELLE.md`. **Aucun test de cette V2.2 sur l'application Angular réelle n'a encore été effectué.** La validation concerne le design et n'est ni une recette fonctionnelle ni une validation de production.

## 7. Relais

**Propriétaire de l'étape suivante : ATLAS Dev**. Statut attendu au démarrage : `IMPLEMENTATION`; au terme d'une version candidate compilable et vérifiable : `VISUAL_QA` pour retour à AURA. SENTINEL intervient ensuite pour l'audit technique avant `DONE`.

## 8. Avenant UE — sélecteur avec recherche intégrée (9 novembre 2026)

**Demande explicite de l’utilisateur :** « le nouveau style de filtre avec barre de recherche doit aussi être appliqué à la recherche des UE ».

**Décision :** dans chaque interface où l’on **choisit une UE** (notamment Ajouter/Modifier une séance), reprendre le **même composant combobox recherchable que pour les enseignants**, dans la direction visuelle blanche et sobre V2.2. Ne pas conserver deux contrôles successifs « Rechercher une UE » puis « Sélectionner une UE ».

- Champ unique avec recherche intégrée et liste ancrée au champ ; intitulé **« Matière / UE »**, aide **« Rechercher ou choisir une UE »**.
- Rechercher **par code et par intitulé** (y compris sous-chaîne), sans sensibilité à la casse, aux accents ou aux espaces superflus. Résultat sur deux niveaux : **intitulé complet** et **code UE**. Afficher un résultat vide explicite et proposer d’effacer la recherche.
- Choix explicite dans la liste : afficher l’UE sélectionnée, avec son code, et conserver **son `ue_id` réel** pour la sauvegarde. La saisie de texte libre ne vaut pas sélection.
- En cas de modification d'une séance, initialiser le champ avec l'UE réellement associée. En cas de changement de classe/parcours qui invalide l'UE, demander un nouveau choix sans enregistrer de rattachement incohérent.
- Conserver la logique métier du mode **Activité hors cours** (pas d'UE exigée si le mode ne le prévoit pas), les règles d'accès, les listes d'UE autorisées et toutes les validations existantes.
- Navigation clavier : Tab, Flèches, Entrée pour choisir, Échap pour fermer ; focus visible, `role=combobox`, `aria-expanded`, `aria-controls` et états cohérents ; fermeture au clic extérieur.
- Si un autre écran possède un **sélecteur d’UE**, réemployer ce même composant. Un simple champ de recherche de tableau, sans valeur à choisir, peut rester un filtre texte tant qu'il respecte la charte.
- **Aucune refonte de disposition** de la V2.2 approuvée et **aucune modification du modèle de données** ne sont autorisées par cet avenant.

**Écart connu avant intégration :** dans le fichier Angular `FRONT/src/app/plannings/plannings.html` de la dernière archive ATLAS disponible, le formulaire contient encore `[(ngModel)]="ueSearch"` puis `<select [(ngModel)]="modalData.ue_id">` avec `filteredUes`. ATLAS doit remplacer ce couple par une seule combobox et conserver la vraie valeur `modalData.ue_id` ; ne pas supprimer les filtres de compatibilité UE/classe s'ils existent. Vérifier sur la version **actuelle** du projet Windows avant toute modification.

**Critères de recette :** trouver une UE par code et par nom, choisir au clavier et à la souris, réouvrir une séance préremplie, refuser un texte non sélectionné, préserver l'UE choisie après fermeture/réouverture, conserver le bon `ue_id` à l'enregistrement, vérifier les deux modes de séance et l'absence de régression des 12 tests existants.

**Statut :** complément de périmètre explicitement demandé par l’utilisateur, sans remplacement ni altération de la référence visuelle V2.2 déjà validée. Intégration réelle Angular non exécutée à cette étape AURA.

