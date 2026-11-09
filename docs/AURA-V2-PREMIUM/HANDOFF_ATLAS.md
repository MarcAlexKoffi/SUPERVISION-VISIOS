# HANDOFF — AURA vers ATLAS

**Projet :** SUPERVISION-VISIOS / UDMCI SUPERVISION  
**Identifiant :** SV-L3-UI-01 (modernisation premium) et SV-L3-UI-02 (correction recherche enseignants)  
**Statut source :** DESIGN_VALIDATED — `AURA-V2-PREMIUM-2026-11-08`  
**Statut suivant :** IMPLEMENTATION (ATLAS)  
**Validation humaine :** « voilà c'est bon » après présentation de la V2 premium sans changement d'architecture.

### Entrées et sources de vérité

- `DESIGN_CONTRACT.md`
- `REFERENCE_VISUELLE_AURA_V2_PREMIUM.png`
- `SUPERVISION_VISIOS_AURA_V2_PREMIUM_VALIDEE.html`
- `AURA_V2_REVUE_ET_NON_REGRESSION.md`
- `SUPERVISION-VISIOS_LOT3_CANDIDAT.zip` (code de base déjà livré ; conserver sauvegarde).

### Périmètre

- Adapter **les composants Angular existants**, pas une maquette HTML autonome ; conserver les routes, services et modèles.
- Appliquer uniquement la police, la palette, les composants, les effets, la hiérarchie et la densité du rendu premium aux dispositions V2 déjà validées.
- Corriger la recherche des enseignants dans le formulaire et rendre celle de la vue Enseignant autonome : ne pas partager le même état de saisie, préserver explicitement la sélection jusqu'à une nouvelle sélection.
- Adapter les pages Planning et Enseignants ; aucune refonte non autorisée d'autres modules.

### Protections

- Aucun remplacement Firestore/API/backend pour une simple évolution visuelle.
- Aucun changement de permissions, aucun déploiement, aucune migration de base de données.
- Ne pas supprimer : calendrier horaire à durée réelle, supervision liée, contrôles horaires, états et annulations, exports, impression, formulaires et rubriques du menu.
- Conserver un diff traçable, une copie de sécurité et un plan de retour arrière.

### Vérifications attendues

1. `npm ci`, `npm run build` frontend et backend, tests existants, noter les blocages de dépendances.
2. Contrôles visuels desktop/mobile contre la référence : 1440, 1024, 768, 390, 320 px ; clavier/zoom 200 %.
3. Recherches enseignant ; filtre par classe/statut et semaine ; conflits; création/édition/suppression ; statut ; supervision liée ; PDF.
4. Vérifier les parcours enseignants (tri, pagination, recherche, formulaires), états vides, erreurs, permissions de test.
5. Remettre le rapport des modifications et écarts, les tests réussis/non exécutés, puis statut **VISUAL_QA** (pas DONE).
