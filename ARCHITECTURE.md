# Architecture technique — SUPERVISION-VISIOS

## Vue d'ensemble
- Frontend: SPA Angular (dossier `FRONT/src`) déployée sur Vercel/CDN.
- Backend: API REST en Node.js + TypeScript (dossier `BACKEND/src`) exposant les controllers et routes.
- Base de données: Firestore (collections principales listées dans le fichier de schéma).
- Authentification: tokens JWT ou Firebase Auth (le repo contient `serviceAccountKey.json` → usage Admin SDK possible).
- Jobs & Scripts: scripts de migration et tâches asynchrones (dossier `BACKEND/src/scripts`).

## Diagramme (Mermaid)
```mermaid
graph LR
  A[Frontend (Angular)] -->|REST + Authorization| B[API (Node + TypeScript)]
  B -->|reads/writes| C[Firestore]
  B -->|admin ops| D[Firebase Admin / Auth]
  B --> E[Email service / SMTP]
  B --> F[Background jobs / scripts]
  A --> G[Vercel / CDN]
  H[CI/CD (GitHub Actions)] --> B
  H --> A
  C --- I[Indexes & Security Rules]
```

## Composants & responsabilités
- `FRONT/src` : routes, guards, interceptors, UI pour plannings, supervisions, users, teachers, UEs.
- `BACKEND/src/server.ts` : bootstrap Express / middlewares (auth, logging), connexion Firestore.
- `BACKEND/src/controllers` : logique métier (plannings, supervisions, users, teachers, ues, classes, parcours...).
- `BACKEND/src/scripts` : migrations et tâches d'admin (seed, fixes de schéma).
- `BACKEND/src/utils` : services transverses (emailService, token generation).

## Déploiement recommandé
- Frontend : build Angular → déployer sur Vercel (ou Netlify). Utiliser `vercel.json` existant.
- Backend : containeriser (Docker) et déployer sur Cloud Run / DigitalOcean App / Kubernetes.
- Secrets : ne pas committer `serviceAccountKey.json` — utiliser Secret Manager (GCP), GitHub Secrets ou équivalent.
- CI/CD : GitHub Actions → tests, build, lint, déploiement automatique.

## Observabilité & sécurité
- Logs structurés JSON, erreurs capturées par Sentry.
- Monitoring: métriques latence/erreurs (Cloud Monitoring / Datadog).
- Appliquer règles Firestore (principe least-privilege) et valider côté serveur toutes les entrées.

---

Fichiers associés : [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md)
