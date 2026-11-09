# DESIGN_CONTRACT — SUPERVISION-VISIOS — AURA V2 Premium

**Révision validée :** `AURA-V2-PREMIUM-2026-11-08`  
**État :** `DESIGN_VALIDATED`  
**Produit :** UDMCI SUPERVISION — SUPERVISION-VISIOS  
**Périmètre :** Planning Visios (vues Superviseur, Calendrier, Enseignant) et harmonisation de la rubrique Enseignants.  
**Validation humaine :** le 8 novembre 2026, après approbation de la disposition V2, l'utilisateur a demandé uniquement l'amélioration premium de la police et du rendu sans déplacement ni suppression d'éléments ; après présentation de l'image premium reprenant exactement cette disposition, il a confirmé : « voilà c'est bon ».  
**Sources :** capture V2 validée par l'utilisateur ; rendu premium accepté ; prototype interactif HTML V2 original ; code candidat Lot 3 déjà disponible.

## Référence à respecter

- `REFERENCE_VISUELLE_AURA_V2_PREMIUM.png` : **référence visuelle principale approuvée** (hiérarchie et rendu de la capture ; la zone de l'OS Windows n'est pas une partie de l'application).
- `SUPERVISION_VISIOS_AURA_V2_PREMIUM_VALIDEE.html` : référence interactive et technique de la mise en page V2 et du traitement premium. Données **fictives**, sans Firebase et sans API. Les composants Angular restent la cible finale.
- `AURA_V2_REVUE_ET_NON_REGRESSION.md` : tableau initial des fonctionnalités et comportements à préserver.

**Règle de priorité :** pour l'architecture, conserver sans modification la disposition V2 approuvée ; pour le rendu (police, couleurs, surfaces, ombres, contraste), se référer au visuel premium approuvé ; pour les comportements et règles métier, se référer au produit existant et à son code, pas au prototype simulé. En cas de conflit, ne pas trancher silencieusement.

## Éléments intouchables — disposition validée

1. Navigation latérale UDMCI, identité SUPERVISION, mêmes rubriques et même ordre.
2. Fil d'Ariane « Gestion académique / Planning Visios » et état de préproduction (l'étiquette du prototype n'est pas à livrer en production).
3. Zone de titre « Organisation & supervision / Planning des visioconférences », sous-titre, trois actions « Exporter PDF », « Imprimer », « Ajouter une séance », à leurs emplacements approuvés.
4. **Bande horizontale compacte** des quatre indicateurs (séances, à superviser, supervisées, annulées) : ne pas la remplacer par quatre grandes cartes.
5. Trois onglets « Superviseur », « Calendrier », « Enseignant », placés à gauche ; navigation hebdomadaire, à droite ; bouton « Aujourd'hui » à son emplacement.
6. Barre de filtres « Recherche rapide / Classe / Statut / Effacer » et la vue opérationnelle « Séances de la semaine » regroupée par jour.
7. Vue Enseignant avec recherche et sélection d'un intervenant ; navigation et filtres préservés.
8. Page Enseignants harmonisée, sans perdre ses colonnes, tri, pagination, formulaire ni actions.
9. Règles métier, données, routes, rôles et droits préexistants conservés.

## Tokens de présentation — cibles pour intégration (approximation CSS à comparer au visuel)

| Domaine | Cible |
|---|---|
| Police premium | `Manrope` si disponible, puis `Inter`, `Segoe UI`, sans-serif ; poids 500/600 pour textes, 750–850 pour titres, actions et valeurs |
| Bleu principal | `#0D46C5`, nuances fortes `#0738A8`, surfaces actives `#EAF1FF` |
| Encre principale | `#0D1E40` / textes secondaires `#2B4267` |
| Texte secondaire | `#647897` ; labels `#637796` |
| Fond | `#F3F6FD` avec lumière bleue très discrète et non décorative |
| Panneaux | Blanc `#FFFFFF`, bordure `#DDE5F4` |
| Surfaces et ombres | Ombres froides très légères ; éviter l'effet verre opaque ou les ombres fortes sur l'ensemble des cartes |
| Rayon | Panneaux 17–18 px ; contrôles 9–12 px ; badge 7–8 px |
| Typographie | Titres foncés, graisse forte, interlettrage resserré ; textes secondaires très lisibles |
| État actif | Fond bleu pâle et texte bleu saturé, bordure/ombre discrète ; état lisible sans dépendre uniquement de la couleur |
| Formulaires | Fonds blancs ou bleu très pâle, bordure explicite, focus visible, champs alignés |
| Actions primaires | Bleu profond dégradé très léger, texte blanc, taille cohérente, aucun changement de libellé |

La capture approuvée est une image et ne permet pas de mesurer une police ou des pixels avec certitude ; les valeurs ci-dessus sont les choix AURA pour traduire son rendu dans du code, à confirmer par QA visuelle comparée.

## Composants, états et interactions

- **Navigation :** états actif, survol, focus ; mobile repliable ; conserver les rubriques accessibles au clavier.
- **Planning :** tabs `Superviseur`, `Calendrier`, `Enseignant` ; état vide, chargement, erreur et restrictions selon rôle ; navigation semaine précédente/suivante/Aujourd'hui.
- **Filtres :** recherche rapide ; classe ; statut ; bouton Effacer ; champ de recherche enseignant indépendant du champ enseignant dans la modale ; comparaison insensible à la casse et aux accents ; aucun résultat et suppression de sélection explicites.
- **Séance :** créer, modifier, supprimer (confirmation), statut, lien de visio si disponible, fiche de supervision liée, activité hors cours ; informations et durées exactes.
- **Enseignant :** liste, recherche, tri, pagination, ajout, édition, suppression (confirmation), état actif/inactif, parcours ; interactions réelles reprises du code Angular, non de données fictives.
- **Export :** conserver le moteur PDF et l'impression existants, avec les filtres utiles ; ne pas remplacer le PDF par une notification simulée.
- **États standards :** default, hover, focus-visible, active/selected, disabled, loading, empty, error, success ; transitions réduites si `prefers-reduced-motion`.

## Responsive et accessibilité

- Vérifier aux largeurs 320, 390, 768, 1024, 1440 CSS px ; menus repliables, tableaux scrollables dans leur panneau si nécessaire, filtres empilés sur mobile.
- Zoom 200 %, navigation clavier, lisibilité des textes longs, contrastes, focus, modales, confirmations et messages d'erreur.
- **Ne jamais modifier la structure fonctionnelle pour faire coïncider une capture statique.** Les composants doivent rester exploitables avec des données nombreuses.

## Non-régression obligatoire pour ATLAS

1. Routes et menu complet, trois vues, navigation par semaine, recherches et filtres, création/modification/suppression de séance.
2. Types de cours/activités, changement direct de statut, conflits de créneaux, reprogrammations et historique de modifications.
3. Liaison fiche de supervision / séance, préremplissage, conservation des champs et absence de doublons.
4. Lien visio, export PDF, emploi du temps enseignant ; données et droits Firestore inchangés sauf correctif autorisé.
5. Enseignants : recherche, tri, pagination, colonnes et champs, ajout/édition/suppression, statut.
6. Tests frontend, backend, vérifications visuelles et d'accessibilité effectués indépendamment ; absence de régression non présumée par le seul prototype.

## Vérification de cette référence, avant intégration

- **Exécuté et réussi :** tests automatisés de l'HTML premium : sessions initiales, filtre statut et Effacer, recherche d'enseignants insensible aux accents, trois vues, calendrier, statut direct, ajout de séance simulé, gestion enseignants, parcours mobile, zéro exception JavaScript dans les scénarios testés.
- **Exécuté et réussi :** absence de dépassement horizontal à 390 CSS px.
- **Non exécuté sur application réelle :** compilation Angular refondue, connexion Firebase, export réel PDF, tests de rôles, audit sécurité, exhaustivité 320/768/1440, comparaison pixel-à-pixel avec design approuvé et tests de charge.

## Étape suivante

**ATLAS — IMPLEMENTATION :** intégrer dans `FRONT/src/app/plannings/`, `FRONT/src/app/teachers/` et dans les composants de navigation partagés concernés, sans redéfinir l'architecture. Après tests et livraison candidate : **AURA — VISUAL_QA** contre la référence ci-dessus, puis **SENTINEL — TECHNICAL_AUDIT**. Aucun changement sur la production n'est autorisé par ce contrat.
