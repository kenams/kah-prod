# Backend Kah-Prod

## Objectif
Backend pour gérer l'admin, les médias, et le contenu public (artistes, sorties, clips, événements, réseaux).

## Stack proposée
- Node.js (Express) ou NestJS
- Base de données PostgreSQL
- Stockage médias : S3 compatible (Supabase Storage ou équivalent)
- Auth admin par JWT + refresh tokens

## Modules
- Auth admin
- CRUD Artistes / Sorties / Clips / Événements / Réseaux
- Upload médias + CDN
- Endpoint public "site data" pour l'app web

## Flux conseillé
1. L'admin se connecte
2. Il upload les médias
3. Il met à jour les contenus
4. Le site consomme l'API publique

## Fichiers fournis
- `schema.sql` : base PostgreSQL
- `openapi.yaml` : endpoints
- `.env.example` : variables d'environnement
