# Command reference

| Command | Purpose |
|---|---|
| `pnpm dev` | run the Next.js development server |
| `pnpm build` | create a production build |
| `pnpm start` | run the production server after building |
| `pnpm docker:dev` | start the development Docker environment |
| `pnpm docker:dev:build` | rebuild and start the environment |
| `pnpm docker:dev:clean` | delete local project containers, volumes, and images |
| `pnpm docker:prod` | start the production composition |
| `pnpm db:seed` | build a one-off development media worker, apply pending migrations, and seed data according to `SEED_MODE` |
| `pnpm db:seed:worker` | apply pending migrations and seed in the current worker environment |
| `pnpm db:seed:direct` | run the seed in the current environment, primarily for CI or an existing worker container |
| `pnpm db:studio` | open Prisma Studio |
| `pnpm worker:media` | run the media worker outside Docker |
| `pnpm test` | run Vitest |
| `pnpm coverage` | run Vitest coverage |
| `pnpm typecheck` | check TypeScript types |
| `pnpm lint` | run ESLint |
| `pnpm e2e` | run Playwright tests |

<!-- @formatter:off -->
!!! danger "Destructive command"
    `pnpm docker:dev:clean` deletes local PostgreSQL and MinIO volumes. Back up any development data you need to keep.
<!-- @formatter:on -->
