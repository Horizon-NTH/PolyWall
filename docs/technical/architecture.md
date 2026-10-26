# Technical architecture

PolyWall is a TypeScript and Next.js application containing the administration UI, internal APIs, and display player. A separate worker handles expensive media operations.

```mermaid
flowchart LR
    subgraph Web["Next.js process"]
      UI["React pages and components"]
      SA["Server Actions"]
      API["API routes"]
      AUTH["Auth.js + CASL"]
      RT["Display-runtime resolver"]
    end
    DB[(PostgreSQL)]
    REDIS[(Redis)]
    S3[(S3 / MinIO)]
    WORKER["BullMQ media worker"]
    UI --> SA
    UI --> API
    SA --> AUTH
    API --> AUTH
    SA --> DB
    API --> DB
    API --> RT
    RT --> DB
    SA --> S3
    SA --> REDIS
    REDIS --> WORKER
    WORKER --> S3
    WORKER --> DB
```

## Responsibilities

- `src/app`: Next.js pages and API entry points
- `src/components`: administration UI and display player
- `src/actions`: server-side mutations and access checks
- `src/lib`: domain rules and integrations
- `src/schemas`: Zod input validation
- `prisma`: relational schema and migrations
- `src/workers`: asynchronous media processing.

## Mutation path

```mermaid
sequenceDiagram
    participant UI as React form
    participant A as Server Action
    participant Z as Zod schema
    participant C as CASL
    participant P as Prisma
    UI->>A: Submit input
    A->>Z: Validate and normalize
    A->>C: Check role and organization
    A->>P: Transaction or mutation
    P-->>A: Persisted result
    A-->>UI: Result and revalidation
```

The modular monolith keeps types, transactions, and deployment cohesive. Media processing is separated because it depends on resource-heavy native binaries and must scale independently.
