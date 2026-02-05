import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserRole } from '@/generated/prisma/enums';

import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getArgon2Mock, mockArgon2Module } from '@/test/mocks/auth';

mockPrismaModule();
mockArgon2Module();

vi.mock('@/env', () => ({
    env: {
        AUTH_SECRET: 'test-secret',
        AUTH_TRUST_HOST: false,
        REDIS_URL: undefined,
        RATE_LIMIT_DISABLED: false,
    },
}));

vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
    CredentialsSignin: class CredentialsSignin extends Error {
        code = 'credentials';
    },
}));

vi.mock('next-auth/providers/credentials', () => ({
    default: (config: {
        name: string;
        credentials: Record<string, unknown>;
        authorize: (raw: Record<string, unknown>, request?: Request) => Promise<unknown>;
    }) => ({
        id: 'credentials',
        ...config,
    }),
}));

const loadAuthConfig = async () => {
    const mod = await import('@/auth');
    return mod.authConfig;
};

const setupRateLimitMocks = async () => {
    const mod = await import('@/lib/rate-limit');
    const consumeLoginAttempt = vi
        .spyOn(mod, 'consumeLoginAttempt')
        .mockResolvedValue(undefined);
    const resetLoginAttempt = vi
        .spyOn(mod, 'resetLoginAttempt')
        .mockResolvedValue(undefined);

    return {
        consumeLoginAttempt,
        resetLoginAttempt,
        RateLimitExceeded: mod.RateLimitExceeded,
    };
};

describe('auth config', () => {
    let rateLimitMocks: Awaited<ReturnType<typeof setupRateLimitMocks>>;

    beforeEach(async () => {
        vi.resetModules();
        vi.unmock('@/auth');
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public';
        process.env.AUTH_SECRET = 'test-secret';
        process.env.AUTH_TRUST_HOST = 'false';
        process.env.AUTH_URL = 'http://localhost:3000';
        vi.clearAllMocks();
        rateLimitMocks = await setupRateLimitMocks();
    });

    it('rejects invalid credentials before hitting the database', async () => {
        const prisma = await getPrismaMock();
        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        expect(authorize).toBeDefined();

        const result = await authorize?.({email: 'invalid', password: 'password123'});
        expect(result).toBeNull();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(rateLimitMocks.consumeLoginAttempt).not.toHaveBeenCalled();
    });

    it('returns null when the user does not exist', async () => {
        const prisma = await getPrismaMock();
        prisma.user.findUnique.mockResolvedValueOnce(null);

        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        const result = await authorize?.({email: 'user@example.com', password: 'password123'});
        expect(result).toBeNull();
        expect(rateLimitMocks.consumeLoginAttempt).toHaveBeenCalledWith({
            email: 'user@example.com',
            ip: 'unknown',
        });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: {email: 'user@example.com'},
            select: {
                id: true,
                email: true,
                fullName: true,
                passwordHash: true,
                role: true,
                organizationId: true,
                active: true,
            },
        });
    });

    it('returns null when the user is inactive', async () => {
        const prisma = await getPrismaMock();
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            email: 'user@example.com',
            fullName: 'User Example',
            passwordHash: 'hash',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: false,
        });

        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        const result = await authorize?.({email: 'user@example.com', password: 'password123'});
        expect(result).toBeNull();
    });

    it('returns null when the password is incorrect', async () => {
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            email: 'user@example.com',
            fullName: 'User Example',
            passwordHash: 'hash',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: true,
        });
        argon2.verify.mockResolvedValueOnce(false);

        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        const result = await authorize?.({email: 'user@example.com', password: 'password123'});
        expect(result).toBeNull();
    });

    it('returns null when password verification throws', async () => {
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            email: 'user@example.com',
            fullName: 'User Example',
            passwordHash: 'hash',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: true,
        });
        argon2.verify.mockRejectedValueOnce(new Error('boom'));

        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        const result = await authorize?.({email: 'user@example.com', password: 'password123'});
        expect(result).toBeNull();
    });

    it('returns user data when credentials are valid', async () => {
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            email: 'user@example.com',
            fullName: 'User Example',
            passwordHash: 'hash',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: true,
        });
        argon2.verify.mockResolvedValueOnce(true);

        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>) => Promise<unknown>)
            | undefined;

        const result = await authorize?.({email: 'USER@EXAMPLE.COM', password: 'password123'});
        expect(result).toEqual({
            id: 'user-1',
            email: 'user@example.com',
            name: 'User Example',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
        });
        expect(rateLimitMocks.resetLoginAttempt).toHaveBeenCalledWith({
            email: 'user@example.com',
            ip: 'unknown',
        });
    });

    it('throws a rate limited error when limiter blocks the login', async () => {
        const prisma = await getPrismaMock();
        const authConfig = await loadAuthConfig();
        const provider = authConfig.providers.find((item) => item.id === 'credentials');
        const authorize = provider?.authorize as
            | ((credentials: Record<string, unknown>, request?: Request) => Promise<unknown>)
            | undefined;

        rateLimitMocks.consumeLoginAttempt.mockRejectedValueOnce(new rateLimitMocks.RateLimitExceeded(1000));

        const request = new Request('https://example.com', {
            headers: {
                'x-forwarded-for': '203.0.113.5',
            },
        });

        await expect(
            authorize?.({email: 'user@example.com', password: 'password123'}, request),
        ).rejects.toMatchObject({code: 'rate_limited'});
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(rateLimitMocks.consumeLoginAttempt).toHaveBeenCalledWith({
            email: 'user@example.com',
            ip: '203.0.113.5',
        });
    });

    it('adds role and organization data to the token and session', async () => {
        const authConfig = await loadAuthConfig();
        const token = await authConfig.callbacks?.jwt?.({
            token: {
                userId: 'user-1',
                name: 'User Example',
                email: 'user@example.com',
                role: UserRole.CONTENT_MANAGER,
                organizationId: null,
            },
            user: {
                id: 'user-1',
                email: 'user@example.com',
                name: 'User Example',
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
            },
        });

        expect(token).toMatchObject({
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
            userId: 'user-1',
        });

        const session = await authConfig.callbacks?.session?.({
            session: {
                user: {
                    id: 'user-1',
                    email: 'user@example.com',
                    name: 'User Example',
                    role: UserRole.ORGANIZATION_ADMIN,
                    organizationId: 'org-1',
                },
                expires: new Date().toISOString(),
            },
            token: {
                name: 'User Example',
                email: 'user@example.com',
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
                userId: 'user-1',
            },
        });

        expect(session?.user).toMatchObject({
            id: 'user-1',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
        });
    });
});
