# 📊 SCHÉMA DÉTAILLÉ DE LA BASE DE DONNÉES FIRESTORE

---

## Vue d'ensemble - Collections et relations

```
Firestore (SUPERVISION-VISIOS)
│
├─ users
│  ├─ Qui : Tous les utilisateurs (enseignants, superviseurs, admins)
│  ├─ Rôle : Authentification et profils utilisateurs
│  └─ Lien avec : plannings, supervisions, ues
│
├─ teachers
│  ├─ Qui : Enseignants
│  ├─ Rôle : Informations des intervenants pédagogiques
│  └─ Lien avec : plannings, supervisions, ues
│
├─ plannings
│  ├─ Qui : Sessions de visioconférences programmées
│  ├─ Rôle : Calendrier et détails des visios
│  └─ Lien avec : teachers, ues, classes, supervisions
│
├─ supervisions
│  ├─ Qui : Rapports de supervisions pédagogiques
│  ├─ Rôle : Évaluation et retours sur les enseignements
│  └─ Lien avec : users (superviseur), teachers
│
├─ async_supervisions
│  ├─ Qui : Supervisions asynchrones (non en temps réel)
│  ├─ Rôle : Suivi pédagogique différé
│  └─ Lien avec : teachers, ues, classes
│
├─ ues (Unités d'Enseignement)
│  ├─ Qui : Modules de formations
│  ├─ Rôle : Organisé matières/cours
│  └─ Lien avec : classes, teachers, plannings
│
├─ classes
│  ├─ Qui : Groupes d'étudiants
│  ├─ Rôle : Segmentation par promotion/niveau
│  └─ Lien avec : parcours, ues
│
└─ parcours
   ├─ Qui : Parcours d'études (Informatique, Mathématiques, etc.)
   ├─ Rôle : Regroupement de formations
   └─ Lien avec : classes, ues
```

---

## COLLECTION 1 : users

### Description
Stocke tous les utilisateurs de la plateforme avec leurs rôles et permissions.

### Structure complète

```typescript
{
  id: "user_001" | "user_002" | ...  // ID unique généré par Firestore
  
  // Informations de base
  username: string,                    // Ex: "jean_dupont"
  email: string | null,                // Ex: "jean@example.com" (optionnel)
  password: string,                    // PROBLÈME : Actuellement en clair !
                                       // ⚠️ À hasher avec bcrypt
  
  // Rôle et permissions
  role: "admin" | "teacher" | "supervisor" | "user",
                                       // admin : accès complet
                                       // teacher : enseignant
                                       // supervisor : évaluateur
                                       // user : utilisateur standard
  
  // Timestamps
  created_at: Timestamp,               // Ex: 2025-01-15 14:30:00
  updated_at?: Timestamp,              // Dernière modification
  
  // Données optionnelles
  phone?: string,
  department?: string,
  is_active?: boolean
}
```

### Exemples de documents

```json
{
  "id": "user_001",
  "username": "jean_dupont",
  "email": "jean.dupont@example.com",
  "password": "hashed_password_here",
  "role": "teacher",
  "created_at": "2025-01-15T14:30:00Z",
  "department": "Mathématiques"
}
```

```json
{
  "id": "admin_001",
  "username": "admin_system",
  "email": "admin@example.com",
  "password": "hashed_admin_password",
  "role": "admin",
  "created_at": "2024-12-01T08:00:00Z"
}
```

### Index recommandé
```firestore
db.collection('users').where('role', '==', 'teacher').orderBy('created_at')
```

---

## COLLECTION 2 : teachers

### Description
Informations détaillées des enseignants (extension de users pour les profs).

### Structure complète

```typescript
{
  id: "teacher_001" | "teacher_002" | ...
  
  // Informations personnelles
  first_name: string,                  // Ex: "Jean"
  last_name: string,                   // Ex: "Dupont"
  email: string,                       // Ex: "jean.dupont@example.com"
  phone?: string,                      // Ex: "06 12 34 56 78"
  
  // Affiliation
  department: string,                  // Ex: "Mathématiques", "Informatique"
  specialization?: string,             // Ex: "Algèbre"
  
  // Statut
  status?: "active" | "inactive" | "on_leave",
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "teacher_001",
  "first_name": "Jean",
  "last_name": "Dupont",
  "email": "jean.dupont@example.com",
  "phone": "06 12 34 56 78",
  "department": "Mathématiques",
  "specialization": "Algèbre Linéaire",
  "status": "active",
  "created_at": "2025-01-10T10:00:00Z"
}
```

### Index recommandé
```firestore
db.collection('teachers').orderBy('last_name')
db.collection('teachers').where('department', '==', 'Mathématiques')
```

---

## COLLECTION 3 : plannings

### Description
Calendrier des visioconférences programmées avec tous les détails.

### Structure complète

```typescript
{
  id: "planning_001" | "planning_002" | ...
  
  // Identifiants des références
  teacher_id: string,                  // Lien vers teachers collection
  ue_id: string | null,                // Unité d'enseignement (optionnel)
  classe_id?: string,                  // Classe concernée
  
  // Informations du planning
  title: string,                       // Ex: "Visio Mathématiques L1"
  description?: string,                // Détails de la séance
  
  // Date et heure
  date: string,                        // Format: "YYYY-MM-DD" (ex: "2025-02-10")
  start_time: string,                  // Format: "HH:MM" (ex: "14:00")
  end_time?: string,                   // Format: "HH:MM" (ex: "15:30")
  
  // Type et plateforme
  session_type: "lecture" | "practical" | "seminar" | "other",
                                       // Type de session
  platform: "Google Meet" | "Zoom" | "Teams" | "other",
                                       // Plateforme utilisée
  visio_link: string,                  // Lien de connexion
  
  // Statut de supervision
  status: "À superviser" | "En cours" | "Terminé" | "Annulé",
  
  // Données dénormalisées (copies pour performances)
  ue_code?: string,                    // Code UE (ex: "MATH-101")
  ue_name?: string,                    // Nom UE (ex: "Algèbre")
  teacher_first_name?: string,         // Nom enseignant
  teacher_last_name?: string,
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp,
  
  // Métadonnées
  parcours?: string,                   // Parcours d'études
  level?: string                       // Niveau (L1, L2, L3, M1, M2)
}
```

### Exemples

```json
{
  "id": "planning_001",
  "teacher_id": "teacher_001",
  "ue_id": "ue_math_101",
  "title": "Visio Algèbre Linéaire L1",
  "description": "Séance sur les matrices et déterminants",
  "date": "2025-02-10",
  "start_time": "14:00",
  "end_time": "15:30",
  "session_type": "lecture",
  "platform": "Google Meet",
  "visio_link": "https://meet.google.com/abc-defg-hij",
  "status": "À superviser",
  "ue_code": "MATH-101",
  "ue_name": "Algèbre Linéaire",
  "teacher_first_name": "Jean",
  "teacher_last_name": "Dupont",
  "parcours": "Informatique",
  "level": "L1",
  "created_at": "2025-01-20T11:00:00Z"
}
```

### Index recommandés
```firestore
// Récupérer plannings d'une date
db.collection('plannings').where('date', '==', '2025-02-10')

// Récupérer plannings d'un enseignant
db.collection('plannings').where('teacher_id', '==', 'teacher_001')

// Récupérer plannings d'une UE
db.collection('plannings').where('ue_id', '==', 'ue_math_101')

// Plannings à superviser, triés par date
db.collection('plannings')
  .where('status', '==', 'À superviser')
  .orderBy('date')
```

---

## COLLECTION 4 : supervisions

### Description
Rapports de supervisions pédagogiques après une visite/observation de classe.

### Structure complète

```typescript
{
  id: "supervision_001" | "supervision_002" | ...
  
  // Acteurs
  user_id: string,                     // ID du superviseur (créateur)
  teacher_id: string,                  // ID de l'enseignant évalué
  teacher_name?: string,               // Nom enseignant (dénormalisé)
  
  // Contexte pédagogique
  module: string,                      // Ex: "Algèbre", "Programmation"
  level: string,                       // Ex: "L1", "M1"
  classe_id?: string,                  // Classe observée
  
  // Timing
  visit_date: string,                  // Date visite (format: "YYYY-MM-DD")
  start_time?: string,                 // Heure début (format: "HH:MM")
  end_time?: string,                   // Heure fin
  
  // Données pédagogiques
  
  // Aspect technique
  tech_internet: number | null,        // Score 1-5 (Qualité internet)
  tech_audio_video: number | null,     // Score 1-5 (Qualité son/vidéo)
  tech_punctuality: number | null,     // Score 1-5 (Ponctualité)
  
  // Aspect pédagogique
  ped_objectives: number | null,       // Score 1-5 (Clarté des objectifs)
  ped_content_mastery: number | null,  // Score 1-5 (Maîtrise du contenu)
  ped_interaction: number | null,      // Score 1-5 (Interaction avec étudiants)
  ped_tools_usage: number | null,      // Score 1-5 (Utilisation outils pédagogiques)
  
  // Effectifs
  present_count: number,               // Nombre étudiants présents
  total_students: number,              // Nombre total étudiants
  
  // Retours
  observations: string,                // Commentaires détaillés du superviseur
  recommendations?: string,            // Recommandations
  
  // Signatures et validation
  supervisor_name: string,             // Nom superviseur
  supervisor_signature?: string,       // Signature (base64 ou URL)
  teacher_signature?: string,          // Signature enseignant (accord)
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "supervision_001",
  "user_id": "user_002",
  "teacher_id": "teacher_001",
  "teacher_name": "Jean Dupont",
  "module": "Algèbre Linéaire",
  "level": "L1",
  "classe_id": "class_001",
  "visit_date": "2025-02-10",
  "start_time": "14:00",
  "end_time": "15:30",
  "tech_internet": 5,
  "tech_audio_video": 5,
  "tech_punctuality": 5,
  "ped_objectives": 4,
  "ped_content_mastery": 5,
  "ped_interaction": 4,
  "ped_tools_usage": 4,
  "present_count": 28,
  "total_students": 30,
  "observations": "Excellente qualité pédagogique. Enseignant bien préparé. Interactions fluides avec les étudiants.",
  "supervisor_name": "Marie Martin",
  "created_at": "2025-02-10T16:00:00Z"
}
```

### Index recommandés
```firestore
// Supervisions d'un utilisateur, triées par date
db.collection('supervisions')
  .where('user_id', '==', 'user_002')
  .orderBy('visit_date', 'desc')

// Supervisions d'un enseignant
db.collection('supervisions').where('teacher_id', '==', 'teacher_001')
```

---

## COLLECTION 5 : ues (Unités d'Enseignement)

### Description
Modules et cours dispensés dans les formations.

### Structure complète

```typescript
{
  id: "ue_001" | "ue_math_101" | ...
  
  // Identifiants et codes
  code: string,                        // Code unique (ex: "MATH-101", "INFO-201")
  name: string,                        // Nom complet (ex: "Algèbre Linéaire")
  
  // Contenu
  description?: string,                // Description du module
  
  // Structuration académique
  level: string,                       // Niveau (L1, L2, L3, M1, M2)
  semester: number,                    // Semestre (1, 2, 3...)
  phase?: string,                      // Phase si pertinent
  modules_count: number,               // Nombre de modules/chapitres
  
  // Responsabilités
  responsible?: string,                // Nom du responsable UE
  user_id?: string,                    // ID user propriétaire
  
  // Affiliation
  department: string,                  // Département (ex: "Mathématiques")
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "ue_math_101",
  "code": "MATH-101",
  "name": "Algèbre Linéaire",
  "description": "Étude des matrices, espaces vectoriels, applications linéaires",
  "level": "L1",
  "semester": 1,
  "modules_count": 3,
  "responsible": "Prof. Jean Dupont",
  "department": "Mathématiques",
  "created_at": "2025-01-05T08:00:00Z"
}
```

```json
{
  "id": "ue_info_201",
  "code": "INFO-201",
  "name": "Programmation Orientée Objet",
  "description": "Concepts OOP : classes, héritage, polymorphisme",
  "level": "L2",
  "semester": 2,
  "modules_count": 4,
  "responsible": "Prof. Marie Martin",
  "department": "Informatique",
  "created_at": "2025-01-05T09:30:00Z"
}
```

### Index recommandé
```firestore
db.collection('ues').where('level', '==', 'L1')
db.collection('ues').where('department', '==', 'Mathématiques')
```

---

## COLLECTION 6 : classes

### Description
Groupes d'étudiants organisés par niveau et parcours.

### Structure complète

```typescript
{
  id: "class_001" | "class_L1_INFO_A" | ...
  
  // Identifiant
  name: string,                        // Ex: "L1 INFORMATIQUE A", "M1 MATHS"
  
  // Effectifs
  effectif: number,                    // Nombre d'étudiants
  
  // Affiliation
  parcours_id: string,                 // Lien vers parcours
  parcours: string,                    // Nom parcours (dénormalisé)
                                       // Ex: "Informatique", "Mathématiques"
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "class_001",
  "name": "L1 INFORMATIQUE A",
  "effectif": 35,
  "parcours_id": "parcours_info",
  "parcours": "Informatique",
  "created_at": "2025-01-01T00:00:00Z"
}
```

```json
{
  "id": "class_002",
  "name": "L1 INFORMATIQUE B",
  "effectif": 32,
  "parcours_id": "parcours_info",
  "parcours": "Informatique",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Index recommandé
```firestore
db.collection('classes').where('parcours_id', '==', 'parcours_info')
```

---

## COLLECTION 7 : parcours

### Description
Parcours d'études (formations complètes).

### Structure complète

```typescript
{
  id: "parcours_001" | "parcours_info" | ...
  
  // Identifiants
  code: string,                        // Code court (ex: "INFO", "MATH")
  name: string,                        // Nom complet (ex: "Informatique")
  
  // Détails
  description?: string,                // Description du parcours
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "parcours_info",
  "code": "INFO",
  "name": "Informatique",
  "description": "Parcours d'informatique générale avec fondamentaux et spécialisations"
}
```

```json
{
  "id": "parcours_math",
  "code": "MATH",
  "name": "Mathématiques",
  "description": "Parcours mathématiques pures et appliquées"
}
```

---

## COLLECTION 8 : async_supervisions

### Description
Supervisions asynchrones (évaluations non temps réel, formulaires auto-remplis).

### Structure complète

```typescript
{
  id: "async_sup_001" | ...
  
  // Acteurs et contexte
  supervisor_id: string,               // ID superviseur
  teacher_id: string,                  // ID enseignant
  ue_id: string,                       // UE concernée
  classe_id: string,                   // Classe observée
  
  // Semaine et statut
  week: number,                        // Numéro semaine (ex: 1-52)
  status: "pending" | "in_progress" | "completed" | "reviewed",
                                       // État du formulaire
  
  // Observations
  observations: string,                // Retours du superviseur
  
  // Timestamps
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### Exemples

```json
{
  "id": "async_sup_001",
  "supervisor_id": "user_002",
  "teacher_id": "teacher_001",
  "ue_id": "ue_math_101",
  "classe_id": "class_001",
  "week": 6,
  "status": "completed",
  "observations": "Bonne progression du cours. À améliorer: interaction avec étudiants.",
  "created_at": "2025-02-01T10:00:00Z"
}
```

---

## Diagramme des relations

```
                    ┌─────────────────────────┐
                    │       parcours          │
                    │  (Parcours d'études)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────►│◄────────────┐
                    │             │             │
              ┌─────▼────────┐    │       ┌─────▼────────┐
              │    classes   │    │       │     ues      │
              │  (Groupes)   │    │       │   (Modules)  │
              └──────┬───────┘    │       └─────┬────────┘
                     │            │             │
                     │            ▼             │
                     │        ┌────────────┐    │
                     │        │  teachers  │    │
                     │        │(Enseignants)   │
                     │        └────┬───────┘    │
                     │             │            │
                     │        ┌────▼────────────▼────┐
                     ├───────►│     plannings        │
                     │        │(Visioconférences)   │
                     │        └────────┬────────────┘
                     │                 │
                     │                 │
                     │        ┌────────▼────────┐
                     │        │  supervisions   │
                     │        │  (Évaluations)  │
                     │        └────┬────────────┘
                     │             │
                     │        ┌────▼─────────────┐
                     └───────►│      users       │
                              │ (Superviseurs)  │
                              └──────────────────┘


Legend:
───►   : Lien de référence (FK)
        : Relation implicite
```

---

## Statistiques et volumes de données

### Estimation des volumes typiques

| Collection | Estimation | Croissance |
|------------|-----------|-----------|
| users | 100-500 | Annuelle |
| teachers | 50-200 | Annuelle |
| plannings | 1000-5000 | Mensuelle |
| supervisions | 500-2000 | Mensuelle |
| async_supervisions | 200-1000 | Mensuelle |
| ues | 50-150 | Semestrielle |
| classes | 20-100 | Annuelle |
| parcours | 5-20 | Stable |

### Tailles estimées
- **users** : ~0.5 KB par document
- **plannings** : ~2 KB par document
- **supervisions** : ~1.5 KB par document

---

## Requêtes Firestore courantes

### 1. Récupérer tous les plannings d'une date
```typescript
const date = "2025-02-10";
const snapshot = await db.collection('plannings')
  .where('date', '==', date)
  .get();
```

### 2. Récupérer les supervisions d'un utilisateur
```typescript
const userId = "user_002";
const snapshot = await db.collection('supervisions')
  .where('user_id', '==', userId)
  .orderBy('visit_date', 'desc')
  .limit(10)
  .get();
```

### 3. Récupérer plannings à superviser
```typescript
const snapshot = await db.collection('plannings')
  .where('status', '==', 'À superviser')
  .orderBy('date')
  .get();
```

### 4. Compter documents d'une collection
```typescript
const snapshot = await db.collection('supervisions')
  .where('user_id', '==', userId)
  .count()
  .get();
```

---

## Sécurité - Firestore Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Fonction helper : vérifier si admin
    function isAdmin() {
      return request.auth.token.role == 'admin';
    }
    
    // Fonction helper : vérifier si propriétaire du document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Collection users
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId) || isAdmin();
    }
    
    // Collection teachers
    match /teachers/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Collection plannings
    match /plannings/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Collection supervisions
    match /supervisions/{docId} {
      allow read: if isOwner(resource.data.user_id) || isAdmin();
      allow write: if isOwner(resource.data.user_id) || isAdmin();
    }
    
    // Collections publiques
    match /ues/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    match /classes/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    match /parcours/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

---

## Conclusion

Cette base de données est conçue pour :
✅ **Performance** : Queries optimisées avec indexes
✅ **Sécurité** : Rules strictes pour protéger les données
✅ **Scalabilité** : Structure prête pour la croissance
✅ **Maintenabilité** : Schéma cohérent et clairement documenté

