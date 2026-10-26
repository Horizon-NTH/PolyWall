# Tests

Shared framework mocks live in `src/test/mocks` and are loaded by `src/test/setup.ts`.

- `next-navigation.ts` provides `routerMock`, `setMockPathname`, and `setMockSearchParams`.
- `next-link.tsx` replaces `next/link` with a plain HTML anchor.
- `sonner.ts` provides `toastMock`.
- `auth.ts`, `casl.ts`, and `prisma.ts` expose reset helpers for Server Action tests.
- `fixtures/builders.ts` provides builders for commonly repeated table data, schedule data, and action payloads.

In component tests, prefer these helpers for cross-cutting dependencies (`next/navigation`, `next/link`, and `sonner`). Keep domain-specific mocks in the test file when they express the scenario, such as `createUserMock`, `deletePlaylistMock`, or a component-specific Server Action mock.
