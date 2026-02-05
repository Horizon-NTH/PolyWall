import { vi } from 'vitest';
import { UserRole } from '@/generated/prisma/enums';

export const mockAuthModule = () => {
    vi.doMock('@/auth', () => ({
        auth: vi.fn(),
        unstable_update: vi.fn(),
    }));
};

export const getAuthMocks = async () => {
    const mod = await import('@/auth');
    return mod as unknown as {
        auth: ReturnType<typeof vi.fn>;
        unstable_update: ReturnType<typeof vi.fn>;
    };
};

export const mockArgon2Module = () => {
    vi.doMock('argon2', () => ({
        default: {
            verify: vi.fn(),
            hash: vi.fn(),
        },
        verify: vi.fn(),
        hash: vi.fn(),
    }));
};

export const getArgon2Mock = async () => {
    const mod = await import('argon2');
    const resolved = (mod as { default?: unknown }).default ?? mod;
    return resolved as unknown as {
        verify: ReturnType<typeof vi.fn>;
        hash: ReturnType<typeof vi.fn>;
    };
};

export const buildSession = (overrides?: {
    user?: Partial<{
        id: string;
        email: string;
        name: string;
        role: UserRole;
        organizationId: string | null;
    }>;
    expires?: string;
}) => ({
    user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User Example',
        role: UserRole.ORGANIZATION_ADMIN,
        organizationId: 'org-1',
        ...(overrides?.user ?? {}),
    },
    expires: overrides?.expires ?? new Date().toISOString(),
});
