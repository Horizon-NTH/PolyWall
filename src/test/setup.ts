import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { resetNavigationMocks } from '@/test/mocks/next-navigation';
import '@/test/mocks/next-link';
import { resetToastMocks } from '@/test/mocks/sonner';

vi.mock('server-only', () => ({}));
vi.mock('@/env', () => ({
    env: {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
        AUTH_SECRET: 'test-secret',
        AUTH_TRUST_HOST: false,
        AUTH_URL: 'http://localhost:3000',
        LOG_LEVEL: 'silent',
        LOG_PRETTY: false,
        REDIS_URL: undefined,
        RATE_LIMIT_DISABLED: false,
    },
}));

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
});

beforeEach(() => {
    resetNavigationMocks();
    resetToastMocks();
});
