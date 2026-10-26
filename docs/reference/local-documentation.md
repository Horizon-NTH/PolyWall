# Documentation close to the code

Some specialized notes intentionally remain beside their implementation:

- `prisma/SEED.md`: seed modes, variables, accounts, and optional media
- `src/components/table/README.md`: TanStack table composition
- `src/test/README.md`: shared mocks and fixtures
- `LOG.md`: detailed Pino event structure.

The MkDocs site provides workflows and system-level context. Local README files explain conventions needed while changing a specific subsystem. When information matters to both users and developers, the site should remain the primary source and local notes can link back to it.
