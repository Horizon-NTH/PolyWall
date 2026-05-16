# Tests

Les mocks de framework partagés vivent dans `src/test/mocks` et sont chargés par `src/test/setup.ts`.

- `next-navigation.ts` fournit `routerMock`, `setMockPathname` et `setMockSearchParams`.
- `next-link.tsx` remplace `next/link` par une ancre HTML simple.
- `sonner.ts` fournit `toastMock`.
- `auth.ts`, `casl.ts` et `prisma.ts` exposent des helpers de reset pour les tests d'actions serveur.
- `fixtures/builders.ts` fournit des builders pour les données de table, de planning et de payloads d'actions les plus répétées.

Dans les tests composants, privilégier ces helpers pour les dépendances transversales (`next/navigation`, `next/link`, `sonner`). Garder les mocks métier dans le fichier de test quand ils expriment le scénario testé, par exemple `createUserMock`, `deletePlaylistMock` ou un mock d'action serveur propre au composant.
