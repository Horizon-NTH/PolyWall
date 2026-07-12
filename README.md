# PolyWall

PolyWall est une application web de gestion d'affichage dynamique pour organiser des medias, playlists, programmations, canaux, ecrans et modeles d'affichage multi-zones.

## Prerequis

- Node.js compatible avec Next.js 16
- pnpm 10.32.1
- Docker, pour l'environnement local complet
- `ffmpeg`, Poppler et LibreOffice si le worker media est lance hors Docker

## Demarrage local

```bash
pnpm install
cp .env.example .env
pnpm docker:dev
```

Le compose de developpement lance l'application, PostgreSQL, Redis, MinIO et le worker media.

## Base de donnees

```bash
pnpm exec prisma migrate dev
pnpm db:seed
```

Le seed cree des donnees de demonstration: organisations, utilisateurs, modeles, canaux, ecrans, widgets, medias, playlists et programmations.

## Commandes utiles

```bash
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm e2e
pnpm audit
```

## Affichage ecran

L'interface client des ecrans est disponible sur `/display`. Un ecran genere un identifiant local, saisit un code OTP cree depuis l'administration, puis attend la validation d'un administrateur avant de diffuser le canal associe.

## Worker media

Le worker traite les fichiers importes, genere les vignettes et rend les PDF/presentations en images exploitables par les ecrans.

```bash
pnpm worker:media
```

En Docker, le worker utilise l'image `Dockerfile.worker`, qui installe les binaires requis pour les videos, PDF et presentations.
