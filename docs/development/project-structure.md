# Project structure

```text
polywall/
├── docs/                    # MkDocs documentation
├── e2e/                     # Playwright scenarios
├── prisma/                  # schema, migrations, and seed
├── public/                  # static assets
├── src/
│   ├── actions/             # server-side mutations
│   ├── app/                 # Next.js pages and API routes
│   ├── components/          # domain and UI components
│   ├── hooks/               # React hooks
│   ├── lib/                 # services and domain rules
│   ├── schemas/             # Zod validation
│   ├── test/                # shared fixtures and mocks
│   └── workers/             # BullMQ media worker
├── docker-compose*.yaml
├── mkdocs.yml
└── package.json
```

A typical domain feature touches the Prisma model and migration, Zod input schema, CASL rule, Server Action or API route, UI components, automated tests, and relevant documentation.

Adding a widget also requires catalog metadata, seed registration, template-editor controls, runtime rendering, an optional data service, default configuration, refresh policy, and tests.

The `@/` alias resolves to `src/`. Prisma generates types under `src/generated/prisma`. do not edit generated files manually.
