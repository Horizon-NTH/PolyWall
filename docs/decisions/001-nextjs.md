# ADR 001 — Next.js web application

**Status:** Accepted

## Context

PolyWall needs a web administration interface, internal APIs, and a player compatible with browser-based screens.

## Decision

Use Next.js and TypeScript to combine React pages, Server Actions, API routes, and the display client in one deployable application.

## Rationale

- shared types and components
- server rendering for administration pages
- colocated screen and media routes
- one application to build and deploy
- React ecosystem support for visual editors and calendars.

## Consequences

The monolith simplifies consistency and transactions, but the web process must not run expensive media conversions. Those operations run in a separate worker. An application outage affects administration and screen runtime refresh.
