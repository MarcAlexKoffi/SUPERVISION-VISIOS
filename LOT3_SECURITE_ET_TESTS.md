# SUPERVISION-VISIOS - Verification Lot 3 / SENTINEL

Statut : audit statique prelivraison (pas audit dynamique ni QA visuelle).

## Constat S3-001 — CRITIQUE : regles Firestore publiques
- **Preuve** : `firestore.rules` contient `match /{document=**} { allow read, write: if true; }` dans la source fournie.
- **Risque** : si ces regles sont deployees, des tiers peuvent lire, modifier ou supprimer des donnees sans authentification, y compris `planning_day_locks`. Les controles de conflit client/REST ne peuvent pas assurer l'integrite en presence de writers non autorises.
- **Correction attendue** : etablir des regles par role et ressource, tester les autorisations par collection et proteger `planning_day_locks` contre les modifications arbitraires. Ne pas deployer un remplacement non verifie : les besoins des superviseurs/admins et des integrations existantes doivent etre inventoriees.
- **Statut** : non corrige; **blocage production**.

## Constat S3-002 — ELEVE : secrets dans l'archive source
- **Preuve** : l'archive source inclut `BACKEND/serviceAccountKey.json`.
- **Risque** : si la cle privee de compte de service est en circulation, acces potentiellement eleve.
- **Correction effectuee dans le livrable** : fichier exclu du ZIP candidat. Les fichiers d'environnement backend et tous les dossiers `work/izytel-*` sont exclus.
- **Action utilisateur** : verifier la diffusion de l'original; revoquer/regenerer la cle si exposee. Ne pas partager l'original.
- **Statut** : copie candidate assainie; rotation cle non verifiee.

## Constat S3-003 — MOYEN : controle de concurrence/limites non teste en base
- **Preuve** : transaction sur `planning_day_locks/{date}` avec reevaluation des creneaux. Tests purs 9/9 reussis.
- **Risque residuel** : les ecritures hors nouveaux chemins (anciens clients, script admin, console) peuvent ignorer ces verrous. Documents jour volumineux et write contention a mesurer en charge.
- **Suite** : tests Firestore Emulator sur deux comptes en concurrence; verifier retries, index, limites et permissions.
- **Statut** : non execute en integration.

## Constat S3-004 — MOYEN : UX et application non executees
- **Preuve** : dependances Angular non disponibles completement dans l'environnement de preparation.
- **Risque** : erreurs de compilation TypeScript Angular, bindings et responsivite non releves par tests purs.
- **Suite** : compiler, tester navigations et PDF; AURA effectue la QA a 375px, 768px, 1280px.
- **Statut** : non execute.

## Essais manuels recommandes sur preproduction
1. Creer une seance pour classe C1, enseignant E1, 09:00-10:00 : succes; rouvrir puis modifier uniquement la description : toutes les autres valeurs restent intactes.
2. Creer une deuxieme seance pour E1, classe C2, 09:30-10:30 : erreur de conflit E1.
3. Creer une deuxieme seance pour E2, classe C1, 09:30-10:30 : erreur de conflit C1.
4. Creer E1/C2, 10:00-11:00 : succes, creneaux jointifs.
5. Annuler la premiere seance : l'historique est conserve et son creneau est maintenant disponible.
6. Reprogrammer une seance non supervisee de 10:00 a 11:00 : une seule seance change, `reschedule_history` est mis a jour, les vues et PDF sont coherents.
7. Depuis une seance active associee a une UE, ouvrir la fiche de supervision : UE, professeur, classe, jour, heures, plateforme affiches. Enregistrer : `planning_id` et `supervision_id` presents, statut supervise et absence de doublon.
8. Reouvrir une fiche depuis l'historique et modifier une seule valeur : tous les autres champs, observations, selections et signatures restent conserves.
9. Ouvrir la vue Enseignant, choisir E1 : seules ses seances apparaissent, triees; PDF contient les memes lignes.
10. Tester deux utilisateurs creant simultanement le meme creneau : un seul doit reussir.
11. Tenter de supprimer une seance liee : refus; supprimer la fiche liee avec autorisation : le planning redevient disponible pour supervision.
12. Tester le role non-administrateur sur les vues et les documents via des regles de preproduction securisees.

## Decisions et limites
- Aucune migration ni action distante executee.
- Controle AURA de cette nouvelle interface restant a faire et a valider.
- Ne pas confondre `transpileModule` et compilation Angular complete.
- Le frontend et le backend doivent suivre le meme contrat. Si d'autres clients ecrivent dans `plannings`, les migrer avant d'appeler la politique de conflit fiable.
