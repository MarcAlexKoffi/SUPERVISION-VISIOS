# Schéma Firestore (inféré depuis les controllers)

Ce fichier résume les collections observées dans `BACKEND/src/controllers` et des champs typiques. Utilise-le comme référence pour migrations, règles et indexes.

## Collections principales

- **users**
  - id (document id)
  - `username` : string
  - `password` : string (actuellement parfois stocké en clair — remplacer par hash)
  - `email` : string | null
  - `role` : string (ex: `admin`, `user`, `manager`)
  - `created_at` : timestamp

- **plannings**
  - id
  - `parcours` : string
  - `ue_id` : reference id | null
  - `teacher_id` : reference id | null
  - `date` : string / date
  - `start_time` / `end_time` : string
  - `session_type` : string
  - `platform` : string
  - `visio_link` : string
  - `status` : string (ex: `À superviser`, `Terminé`)
  - `title`, `description` : string
  - denormalized: `ue_code`, `ue_name`, `teacher_first_name`, `teacher_last_name`
  - `created_at` : timestamp

- **supervisions**
  - id
  - `user_id` : id (créateur / propriétaire de la fiche)
  - `teacher_name`, `teacher_id`
  - `module` / `level`
  - `visit_date` / `start_time` / `end_time`
  - `present_count`, `total_students`
  - `tech_internet`, `tech_audio_video`, `tech_punctuality`
  - `ped_objectives`, `ped_content_mastery`, `ped_interaction`, `ped_tools_usage`
  - `observations`, `supervisor_name`, `supervisor_signature`, `teacher_signature`
  - `created_at`, `updated_at`

- **async_supervisions**
  - id
  - `supervisor_id`, `teacher_id`, `ue_id`, `classe_id`
  - `week`, `status`, `observations`
  - `created_at`, `updated_at`

- **teachers**
  - id
  - `first_name`, `last_name`, `email`, `department`, `phone`
  - `status` (optionnel)
  - `created_at`

- **ues**
  - id
  - `code`, `name`, `responsible`, `modules_count`, `level`, `semester`, `phase`, `department`
  - `user_id` (owner), `created_at`, `updated_at`

- **classes**
  - id
  - `name`, `effectif`, `parcours_id`, `parcours` (denormalized name)
  - `created_at`

- **parcours**
  - id
  - `code`, `name`, `description`

## Indexes recommandés
- `plannings` : index sur `date` (ou composite `parcours + date` si besoin de filtrer les deux).
- `supervisions` : composite `user_id + visit_date` pour accès restreint par utilisateur.
- `teachers` : index sur `last_name` pour tri.
- `ues` : index sur `user_id, created_at` si on liste par propriétaire.

## Règles de sécurité (exemples)
- Lecture/écriture `users` : seulement l'utilisateur ou admin peut modifier ses données.
- `supervisions` : CRUD autorisé au propriétaire (`user_id == request.auth.uid`) ou `admin`.
- `plannings` : lecture publique selon rôle, écriture restreinte aux utilisateurs autorisés.

Exemple simple (pseudocode) :
```
match /supervisions/{docId} {
  allow read: if resource.data.public == true || request.auth.uid == resource.data.user_id || request.auth.token.role == 'admin';
  allow write, update, delete: if request.auth.uid == resource.data.user_id || request.auth.token.role == 'admin';
}
```

## Remarques & actions urgentes
- Ne **jamais** laisser `serviceAccountKey.json` commité : retirer et utiliser Secret Manager.
- Remplacer stockage de mots de passe en clair par Firebase Auth ou au minimum bcrypt + salt (voir `authController` qui commence à hasher).
- Ajouter tests pour règles Firestore et scripts de migration pour normaliser champs (`created_at` timestamp, noms de champs cohérents).
