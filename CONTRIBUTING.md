# Contributing to PolyWall

Thank you for considering a contribution.

## Before you start

- Open an issue for substantial changes so the scope can be discussed first.
- Keep authorization checks on the server and scope organization-owned data by `organizationId`.
- Validate external input with Zod and record schema changes in a Prisma migration.
- Never commit credentials or personal data.

## Development workflow

1. Follow the [local setup guide](docs/development/local-setup.md).
2. Add or update the most relevant automated tests.
3. Keep the implementation focused on one concern.
4. Update user or technical documentation when behavior changes.
5. Run the checks below before opening a pull request.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run `pnpm e2e` for changes to critical workflows, navigation, permissions, scheduling, or the display runtime.

## Pull requests

Explain the problem, the chosen solution, test coverage, and any migration or deployment impact. Include screenshots when they add useful review context.
