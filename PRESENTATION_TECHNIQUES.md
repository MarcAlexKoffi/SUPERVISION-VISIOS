# 📋 SUPERVISION-VISIOS | Documentation Technique pour la Soutenance

---

## Table des matières
1. [Vue d'ensemble de l'architecture](#vue-densemble)
2. [Stack technologique](#stack-technologique)
3. [Frontend - Angular](#frontend---angular)
4. [Backend - Node.js + Express.js](#backend---nodejs--expressjs)
5. [Hébergement - Firebase](#hébergement---firebase)
6. [Base de données - Firestore](#base-de-données---firestore)
7. [Architecture générale](#architecture-générale)

---

## Vue d'ensemble

**SUPERVISION-VISIOS** est une plateforme web moderne de gestion des supervisions de formations et des visioconférences éducatives. L'application suit une **architecture microservices moderne** avec une séparation claire entre le frontend, le backend et les données.

### Objectives clés :
- ✅ Gestion centralisée des plannings de visioconférences
- ✅ Suivi des supervisions pédagogiques
- ✅ Authentification sécurisée des utilisateurs
- ✅ Stockage des données en cloud avec accès temps réel
- ✅ Déploiement automatisé et scalable

---

## Stack technologique

| Couche | Technologies | Rôle |
|--------|-------------|------|
| **Frontend** | Angular 18+, TypeScript, Tailwind CSS, RxJS | Interface utilisateur responsive et interactive |
| **Backend** | Node.js, Express.js, TypeScript | API REST pour la gestion métier |
| **Base de données** | Google Firestore (NoSQL) | Stockage des données en temps réel |
| **Authentification** | JWT Tokens + Firebase Auth | Sécurisation des accès utilisateurs |
| **Hébergement** | Firebase Hosting (Frontend), Cloud Run/Node Server (Backend) | Infrastructure cloud scalable |
| **Emails** | SMTP Service (ou SendGrid/Brevo) | Notifications et communications |

---

## Frontend - Angular

### Qu'est-ce qu'Angular ?

**Angular** est un framework web moderne développé par Google pour construire des **Single Page Applications (SPA)** — des applications qui fonctionnent entièrement dans le navigateur sans rechargement.

### Avantages pour notre projet :

| Avantage | Explication |
|----------|-----------|
| **Framework complet** | Tout est inclus : routing, state management, HTTP client, formulaires, validation |
| **TypeScript natif** | Typage fort = moins d'erreurs, meilleure maintenabilité |
| **Composants réutilisables** | Code organisé et modulaire = facile à étendre |
| **RxJS Observables** | Gestion élégante des flux asynchrones (appels API, événements) |
| **Excellent tooling** | Angular CLI pour générer du code automatiquement |
| **Performance** | Change detection optimisée, lazy loading des modules |

### Architecture du Frontend

```
FRONT/src/app/
├── app.routes.ts              # Configuration du routage
├── app.ts                       # Composant racine
├── guards/                      # Protections de routes (authentification)
├── interceptors/                # Intercepteurs HTTP (ajout de tokens)
├── services/                    # Services métier
│   ├── auth.service.ts         # Gestion authentification
│   ├── planning.service.ts     # Gestion des plannings
│   ├── supervision.service.ts  # Gestion des supervisions
│   └── ...
├── classes/                     # Pages principales
├── plannings/                   # Module gestion des plannings
├── supervisions/                # Module gestion des supervisions
├── dashboard-home/              # Tableau de bord
├── login/                       # Page de connexion
└── shared/                      # Composants partagés
```

### Technologies clés utilisées :

| Technologie | Utilité |
|------------|---------|
| **RxJS** | Gestion des observables pour les appels API asynchrones |
| **Tailwind CSS** | Framework CSS utilitaire pour un design responsive et moderne |
| **Angular Router** | Navigation entre les pages sans rechargement |
| **HttpClient** | Communication REST avec le backend |
| **Forms** | Réactive Forms pour validation des saisies utilisateur |
| **Guards** | CanActivate pour protéger les routes (authentification) |

### Exemple d'un composant Angular :

```typescript
// planning.component.ts
import { Component, OnInit } from '@angular/core';
import { PlanningService } from '../services/planning.service';

@Component({
  selector: 'app-planning',
  template: `<div *ngFor="let planning of plannings$ | async">
    {{ planning.title }}
  </div>`,
  styles: []
})
export class PlanningComponent implements OnInit {
  plannings$ = this.planningService.getPlannings();

  constructor(private planningService: PlanningService) {}

  ngOnInit() {}
}
```

**Explication** :
- `OnInit` : Hook du cycle de vie du composant
- `plannings$ | async` : L'observable `$` récupère les données, `async` les affiche automatiquement
- Le template se met à jour en temps réel quand les données changent

---

## Backend - Node.js + Express.js

### Qu'est-ce que Node.js ?

**Node.js** est un environnement d'exécution JavaScript côté serveur (basé sur le moteur V8 de Chrome). Il permet d'écrire du JavaScript sur un serveur pour traiter les requêtes, gérer les bases de données, etc.

### Qu'est-ce qu'Express.js ?

**Express.js** est un framework minimaliste pour créer des **API REST** rapidement. Il simplifie la gestion des routes HTTP, middleware et autres fonctionnalités serveur.

### Avantages pour notre projet :

| Avantage | Explication |
|----------|-----------|
| **Même langage** | Frontend ET backend en JavaScript/TypeScript = meilleure cohésion |
| **Très performant** | Node.js utilise un modèle non-bloquant asynchrone (event loop) |
| **Léger et flexible** | Express ne force pas une architecture = liberté de design |
| **Riche écosystème NPM** | Des millions de packages disponibles |
| **Scalable** | Peut gérer des milliers de requêtes simultanées |
| **TypeScript** | Typage static comme le frontend = moins d'erreurs |

### Architecture du Backend

```
BACKEND/src/
├── server.ts                    # Point d'entrée, configuration Express
├── config/
│   └── db.ts                    # Configuration Firestore
├── controllers/                 # Logique métier
│   ├── authController.ts       # Authentification
│   ├── planningController.ts   # Gestion plannings
│   ├── supervisionController.ts # Gestion supervisions
│   ├── teacherController.ts    # Gestion enseignants
│   ├── userController.ts       # Gestion utilisateurs
│   ├── ueController.ts         # Gestion UEs (unités d'enseignement)
│   ├── classeController.ts     # Gestion classes
│   └── ...
├── routes/                      # Définition des endpoints HTTP
│   ├── authRoutes.ts
│   ├── planningRoutes.ts
│   └── ...
├── middleware/
│   └── authMiddleware.ts       # Vérification des tokens JWT
├── utils/
│   ├── emailService.ts         # Envoi d'emails
│   └── token.ts                # Génération/validation JWT
└── scripts/                     # Tâches d'administration
    ├── init-db.ts              # Initialiser la BD
    ├── migrate-to-firestore.ts # Migrations de schéma
    └── ...
```

### Concepts clés d'Express.js :

#### 1️⃣ **Middleware** - Fonctions exécutées avant chaque requête

```typescript
// authMiddleware.ts - Vérifie que l'utilisateur est connecté
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    req.user = verifyJWT(token);
    next(); // Continue vers la route suivante
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});
```

#### 2️⃣ **Routes** - Endpoints HTTP

```typescript
// planningRoutes.ts
app.get('/api/plannings', getAllPlannings);        // GET - Récupérer tous les plannings
app.post('/api/plannings', createPlanning);        // POST - Créer un planning
app.put('/api/plannings/:id', updatePlanning);     // PUT - Modifier un planning
app.delete('/api/plannings/:id', deletePlanning);  // DELETE - Supprimer un planning
```

#### 3️⃣ **Controllers** - Logique métier

```typescript
// planningController.ts
async function getAllPlannings(req: Request, res: Response) {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('plannings').get();
    
    const plannings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(plannings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Flux d'une requête API :

```
1. Client (Angular) envoie une requête HTTP
    ↓
2. Express reçoit et passe par les middlewares
    ↓
3. authMiddleware vérifie le token JWT
    ↓
4. La route correspondante lance le controller
    ↓
5. Le controller récupère/modifie les données dans Firestore
    ↓
6. La réponse JSON est envoyée au client
    ↓
7. Angular affiche les données dans l'interface
```

---

## Hébergement - Firebase

### Qu'est-ce que Firebase ?

**Firebase** est une plateforme de Google pour héberger et gérer des applications web. C'est une solution "Backend-as-a-Service" (BaaS) qui fournit :

- 🏠 **Firebase Hosting** : hébergement du site statique (Frontend Angular)
- 🗄️ **Firestore** : base de données NoSQL en temps réel
- 🔐 **Firebase Auth** : gestion authentification
- ⚡ **Cloud Functions** : exécuter du code serverless
- 📊 **Firebase Analytics** : suivi des utilisateurs

### Architecture de déploiement

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET (CDN)                        │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼────────┐         ┌─────▼──────┐
    │   Firebase │         │   Backend  │
    │   Hosting  │         │  Server    │
    │  (Frontend)│         │ (Node.js)  │
    └────────────┘         └─────┬──────┘
                                 │
                            ┌────▼─────┐
                            │ Firestore │
                            │  (NoSQL)  │
                            └───────────┘
```

### Configuration Firebase (firebase.json)

```json
{
  "hosting": {
    "public": "FRONT/dist/Supervision-visios",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

**Explication** :
- `public` : dossier contenant les fichiers compilés d'Angular à déployer
- `rewrites` : toutes les URLs pointent vers `/index.html` (pour le SPA routing)
- `firestore.rules` : fichier de sécurité pour la BD

### Avantages du hébergement Firebase :

| Avantage | Impact |
|----------|--------|
| **CDN Global** | Les fichiers sont servés depuis le serveur le plus proche = site rapide partout |
| **HTTPS gratuit** | Sécurité SSL/TLS automatique |
| **Déploiement facile** | `firebase deploy` en une ligne |
| **Scalable** | Gère automatiquement le trafic croissant |
| **Gratuit jusqu'à certaines limites** | Parfait pour le démarrage |
| **Logs et monitoring** | Visualiser les erreurs et performances |

---

## Base de données - Firestore

### Qu'est-ce que Firestore ?

**Firestore** est une base de données **NoSQL** en temps réel gérée par Google. Contrairement aux BD SQL traditionnelles (PostgreSQL, MySQL), elle fonctionne avec des **documents JSON** organisés en **collections**.

### SQL vs NoSQL : Concepts clés

| Concept | SQL | NoSQL (Firestore) |
|---------|-----|------------------|
| **Stockage** | Tables avec lignes/colonnes | Collections avec documents |
| **Schéma** | Strict et prédéfini | Flexible et dynamique |
| **Requêtes** | SQL complexes (JOINs) | Requêtes simples, pas de JOINs |
| **Temps réel** | Non (sondage nécessaire) | Oui (listeners en temps réel) |
| **Scalabilité** | Verticale (ajouter de la RAM) | Horizontale (répartir les données) |
| **Transactions** | Full ACID | Limitées à 25 writes/transaction |

### Structure Firestore - Collections et Documents

```
firestore/
├── users/                          ← Collection
│   ├── user_001 (document)
│   │   ├── username: "jean_dupont"
│   │   ├── email: "jean@example.com"
│   │   ├── role: "teacher"
│   │   └── created_at: 2025-01-15 14:30:00
│   │
│   └── user_002
│       ├── username: "marie_martin"
│       ├── email: "marie@example.com"
│       ├── role: "admin"
│       └── created_at: 2025-01-16 09:00:00
│
├── plannings/                      ← Collection
│   ├── planning_001
│   │   ├── title: "Visio Mathématiques"
│   │   ├── date: "2025-02-10"
│   │   ├── start_time: "14:00"
│   │   ├── end_time: "15:30"
│   │   ├── teacher_id: "user_001"
│   │   ├── ue_id: "ue_math_101"
│   │   ├── visio_link: "https://meet.google.com/..."
│   │   ├── status: "À superviser"
│   │   └── created_at: 2025-01-20 11:00:00
│   │
│   └── planning_002
│       └── ... (autres champs)
│
├── supervisions/                   ← Collection
│   ├── supervision_001
│   │   ├── user_id: "user_002"
│   │   ├── teacher_id: "user_001"
│   │   ├── visit_date: "2025-02-10"
│   │   ├── present_count: 28
│   │   ├── total_students: 30
│   │   ├── observations: "Très bonne qualité pédagogique"
│   │   └── created_at: 2025-02-10 16:00:00
│   │
│   └── supervision_002
│       └── ... (autres champs)
│
├── teachers/                       ← Collection
│   ├── teacher_001
│   │   ├── first_name: "Jean"
│   │   ├── last_name: "Dupont"
│   │   ├── email: "jean.dupont@example.com"
│   │   ├── department: "Mathématiques"
│   │   └── created_at: 2025-01-10 10:00:00
│   └── ...
│
├── ues/                            ← Collection (Unités d'Enseignement)
│   ├── ue_math_101
│   │   ├── code: "MATH-101"
│   │   ├── name: "Algèbre Linéaire"
│   │   ├── level: "L1"
│   │   ├── semester: 1
│   │   ├── modules_count: 3
│   │   └── created_at: 2025-01-05 08:00:00
│   └── ...
│
├── classes/                        ← Collection
│   ├── class_001
│   │   ├── name: "L1 INFO A"
│   │   ├── effectif: 35
│   │   ├── parcours_id: "parcours_001"
│   │   └── created_at: 2025-01-01 00:00:00
│   └── ...
│
└── parcours/                       ← Collection (Parcours d'études)
    ├── parcours_001
    │   ├── code: "INFO"
    │   ├── name: "Informatique"
    │   ├── description: "Parcours d'informatique générale"
    │   └── created_at: 2024-12-01 00:00:00
    └── ...
```

### Types de données Firestore

Firestore supporte les types de base JSON :

| Type | Exemple | Utilité |
|------|---------|---------|
| **String** | `"Jean Dupont"` | Texte simple (noms, emails, descriptions) |
| **Number** | `28`, `14.5` | Nombres entiers ou décimaux (compteurs, notes) |
| **Boolean** | `true` ou `false` | Flags (ex: `is_active`, `is_verified`) |
| **Date** | `Timestamp(2025-01-15 14:30)` | Dates et heures (créations, modifications) |
| **Map/Object** | `{ address: "123 rue X" }` | Données structurées (sous-objets) |
| **Array** | `["item1", "item2"]` | Listes de valeurs |
| **Null** | `null` | Absence de valeur |
| **Reference** | `/users/user_001` | Lien vers un autre document |

### Exemple de requêtes Firestore

```typescript
// BACKEND - Récupérer tous les plannings
const db = admin.firestore();
const snapshot = await db.collection('plannings').get();

const plannings = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

```typescript
// BACKEND - Créer un nouveau planning
await db.collection('plannings').add({
  title: "Visio Mathématiques",
  date: "2025-02-10",
  start_time: "14:00",
  teacher_id: "user_001",
  status: "À superviser",
  created_at: admin.firestore.Timestamp.now()
});
```

```typescript
// FRONTEND (Angular) - Écouter les changements en temps réel
this.planningService.getPlannings().subscribe(plannings => {
  console.log("Nouveau planning reçu :", plannings);
  // L'UI se met à jour automatiquement
});
```

### Sécurité - Firestore Rules

Les **Firestore Rules** contrôlent qui peut lire/écrire les données :

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Règle 1 : Un utilisateur ne peut lire/modifier que ses propres données
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || request.auth.token.role == 'admin';
    }
    
    // Règle 2 : Les supervisions sont accessibles au propriétaire ou admin
    match /supervisions/{docId} {
      allow read: if resource.data.user_id == request.auth.uid || request.auth.token.role == 'admin';
      allow write: if request.auth.uid == resource.data.user_id || request.auth.token.role == 'admin';
    }
    
    // Règle 3 : Les plannings sont en lecture publique
    match /plannings/{docId} {
      allow read: if true;  // Tout le monde peut lire
      allow write: if request.auth.token.role == 'admin';  // Seul admin peut écrire
    }
  }
}
```

**Bénéfices** :
- ✅ Empêche les utilisateurs de modifier les données d'autres utilisateurs
- ✅ Protège les informations sensibles
- ✅ Réduit les requêtes invalides (économise de la bande passante)

### Indexes Firestore

Pour que les requêtes complexes fonctionnent rapidement, il faut créer des **indexes** :

```typescript
// Index simple sur le champ date
db.collection('plannings').orderBy('date').limit(10)

// Index composite sur deux champs
db.collection('plannings')
  .where('parcours', '==', 'INFO')
  .orderBy('date', 'desc')
  .limit(20)
```

Firestore suggère automatiquement les indexes manquants lors du premier appel.

---

## Architecture générale

### Flux de données complet

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Navigateur)                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │           Angular Frontend (FRONT/)                           │ │
│  │  - Components (pages, formulaires)                            │ │
│  │  - Services (appels API)                                      │ │
│  │  - Routing (navigation)                                       │ │
│  │  - RxJS (gestion asynchrone)                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────────────────┘
                 │ HTTP REST API Requests
                 │ (GET, POST, PUT, DELETE)
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVEUR (Node.js + Express)                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Node.js Server (BACKEND/)                        │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ Middleware (Authentification, Logging)                 │ │ │
│  │  └──────┬───────────────────────────────────────────────────┘ │ │
│  │  ┌──────▼───────────────────────────────────────────────────┐ │ │
│  │  │ Routes (authRoutes, planningRoutes, etc.)              │ │ │
│  │  └──────┬───────────────────────────────────────────────────┘ │ │
│  │  ┌──────▼───────────────────────────────────────────────────┐ │ │
│  │  │ Controllers (logique métier)                            │ │ │
│  │  │  - authController                                       │ │ │
│  │  │  - planningController                                   │ │ │
│  │  │  - supervisionController                                │ │ │
│  │  │  - teacherController, userController, ueController      │ │ │
│  │  └──────┬───────────────────────────────────────────────────┘ │ │
│  │  ┌──────▼───────────────────────────────────────────────────┐ │ │
│  │  │ Firebase Admin SDK (connexion BD)                       │ │ │
│  │  └──────┬───────────────────────────────────────────────────┘ │ │
│  │         │                                                     │ │
│  │         └─────────────────────────┬─────────────────────────┘ │ │
│  └─────────────────────────────────────┼─────────────────────────┘ │
└──────────────────────────────────────┬─────────────────────────────┘
                                       │ API Queries
                                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD (Firebase)                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │               Firestore (NoSQL Database)                      │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ Collections:                                            │ │ │
│  │  │  - users (profils utilisateurs)                        │ │ │
│  │  │  - plannings (plannings de visioconférences)           │ │ │
│  │  │  - supervisions (rapports de supervisions)             │ │ │
│  │  │  - teachers (enseignants)                              │ │ │
│  │  │  - ues (unités d'enseignement)                         │ │ │
│  │  │  - classes (groupes d'étudiants)                       │ │ │
│  │  │  - parcours (parcours d'études)                        │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │               Firebase Hosting (CDN)                          │ │
│  │  - Distribution fichiers Angular compilés                    │ │
│  │  - Accélération globale (serveurs proches)                   │ │
│  │  - SSL/HTTPS automatique                                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Cycle de vie d'une requête

**Exemple : Récupérer tous les plannings**

```
1. Utilisateur clique sur "Afficher les plannings"
   ↓
2. Angular appelle planning.service.getPlannings()
   ↓
3. Service envoie requête HTTP GET /api/plannings
   ↓
4. Middleware authMiddleware vérifie le token JWT
   ↓
5. Route planningRoutes appelle planningController.getAllPlannings()
   ↓
6. Controller requête Firestore : db.collection('plannings').get()
   ↓
7. Firestore retourne tous les documents plannings
   ↓
8. Controller transforme les données (ajoute id)
   ↓
9. Serveur envoie réponse JSON au client
   ↓
10. Angular Service stocke dans un Observable
   ↓
11. Composant Angular reçoit les données (subscribe)
   ↓
12. Template affiche les plannings dans l'interface
```

### Authentification avec JWT

```typescript
// 1. Utilisateur se connecte (email + mot de passe)
POST /api/auth/login
{ "email": "jean@example.com", "password": "secure123" }

// 2. Backend vérifie les credentials et génère un JWT
RESPONSE:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "user_001", "name": "Jean Dupont", "role": "teacher" }
}

// 3. Frontend stocke le token en localStorage
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// 4. Pour les requêtes suivantes, inclure le token
GET /api/plannings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 5. Backend vérifie le token dans chaque requête
authMiddleware:
  - Extrait le token du header
  - Décode et vérifie la signature
  - Autorise ou refuse l'accès

// 6. Token valide = accès autorisé, Token expiré = nouvel login
```

---

## Résumé des technologies

### Frontend (Angular)
- **Langage** : TypeScript
- **Framework** : Angular 18+
- **Styling** : Tailwind CSS
- **État asynchrone** : RxJS Observables
- **Déploiement** : Firebase Hosting (CDN global)

### Backend (Node.js + Express)
- **Runtime** : Node.js 18+
- **Langage** : TypeScript
- **Framework** : Express.js
- **Base de données** : Firestore (SDK Admin)
- **Authentification** : JWT + Firebase Auth
- **Emails** : SMTP Service

### Données (Firestore)
- **Type** : NoSQL Document-Oriented
- **Temps réel** : Listeners en temps réel
- **Sécurité** : Firestore Rules
- **Scalabilité** : Horizontale (répartition globale)

### Infrastructure (Firebase)
- **Hébergement Frontend** : Firebase Hosting (CDN)
- **Base de données** : Firestore
- **Certificats** : SSL/TLS automatique
- **Monitoring** : Firebase Console

---

## Avantages de cette architecture

✅ **Moderne** : Technologies à jour (Angular 18+, Node.js 18+)
✅ **Scalable** : Peut supporter une croissance d'utilisateurs
✅ **Maintenable** : TypeScript + architecture claire
✅ **Sécurisé** : JWT + Firestore Rules
✅ **Temps réel** : Firestore listeners pour synchronisation instantanée
✅ **Déploiement facile** : Firebase CLI automatisé
✅ **Coût réduit** : Gratuit jusqu'à certaines limites
✅ **Globalement distribué** : CDN Firebase pour accès rapide partout

---

## Dossiers clés du projet

| Dossier | Contenu | Purpose |
|---------|---------|---------|
| `FRONT/` | Angular Frontend | Code source et configuration de l'interface utilisateur |
| `FRONT/src/app/` | Composants, Services, Routes | Logique applicative du frontend |
| `BACKEND/` | Node.js + Express | Serveur backend et API REST |
| `BACKEND/src/controllers/` | Logique métier | Traitement des demandes utilisateurs |
| `BACKEND/src/routes/` | Endpoints HTTP | Définition des routes API |
| `BACKEND/src/scripts/` | Tâches d'admin | Migrations, seeds, nettoyages |
| `BACKEND/src/utils/` | Services transverses | Email, JWT, etc. |

---

## Déploiement

### Frontend
```bash
cd FRONT
npm install
npm run build
firebase deploy --only hosting
```

### Backend
```bash
cd BACKEND
npm install
npm run build
# Déployer sur Cloud Run, Heroku, ou serveur personnel
```

### Base de données
- Firestore est configurée automatiquement dans Firebase Console
- Les règles de sécurité sont définies dans `firestore.rules`
- Les indexes se créent automatiquement à la première requête

---

## Conclusion

**SUPERVISION-VISIOS** utilise une stack technologique moderne, professionnelle et scalable :

- 🎯 **Frontend** : Angular pour une interface réactive et intuitive
- 🔧 **Backend** : Node.js + Express pour une API performante et flexible
- 🗄️ **Base de données** : Firestore pour la scalabilité et le temps réel
- ☁️ **Infrastructure** : Firebase pour l'hébergement sécurisé et global

Cette architecture est utilisée par des millions d'applications production et constitue un excellent choix pour un projet éducatif de gestion de supervisions.

---

**Document préparé pour la soutenance | SUPERVISION-VISIOS**
