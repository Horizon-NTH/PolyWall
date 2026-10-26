# Contributing

The repository-level [contribution guide](https://github.com/Horizon-NTH/PolyWall/blob/master/CONTRIBUTING.md) defines the complete workflow. The engineering rules that matter most are:

- enforce authorization on the server
- scope tenant-owned resources by `organizationId`
- validate input with Zod
- record schema changes in Prisma migrations
- log important mutations without secrets or unnecessary personal data
- update documentation alongside behavior.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Add `pnpm e2e` for critical workflows or navigation changes. Preview documentation with:

```bash
python3.13 -m venv .venv-docs
source .venv-docs/bin/activate
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

Documentation should begin with the reader's goal, use exact interface labels when needed, and include diagrams only when they clarify a relationship or sequence.
