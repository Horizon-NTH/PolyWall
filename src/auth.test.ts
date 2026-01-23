import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserRole } from '@/generated/prisma/enums';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('@/env', () => ({
    env: {
        AUTH_SECRET: 'test-secret',
        AUTH_TRUST_HOST: false,
    },
}));

vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
}));

vi.mock('next-auth/providers/credentials', () => ({
    default: (config: {
        name: string;
        credentials: Record<string, unknown>;
        authorize: (raw: Record<string, unknown>) => Promise<unknown>;
    }) => ({
        id: 'credentials',
        ...config,
    }),
}));

vi.mock('argon2', () => ({
    default: {
        verify: vi.fn(),
    },
}));

const loadAuthConfig = async () => {
    const mod = await import('@/auth');
    return mod.authConfig;
};

const getPrismaMock = async () => {
    const {prisma} = await import('@/lib/prisma');
    return prisma as unknown as {
        user: {
            findUnique: ReturnType<typeof vi.fn>;
        };
    };
};

const getArgon2Mock = async () => {
    const argon2 = (await import('argon2')).default;
    return argon2 as unknown as {
        verify: ReturnType<typeof vi.fn>;
    };
};

describe('auth config', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public';
        process.env.AUTH_SECRET = 'test-secret';
        process.env.AUTH_TRUST_HOST = 'false';
        process.env.AUTH_URL = 'http://localhost:3000';
        vi.clearAllMocks();
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
    });

    it('adds role and organization data to the token and session', async () => {
        const authConfig = await loadAuthConfig();
        const token = await authConfig.callbacks?.jwt?.({
            token: {},
            user: {
                id: 'user-1',
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
                    emailVerified: null,
                    role: UserRole.ORGANIZATION_ADMIN,
                    organizationId: 'org-1',
                },
                sessionToken: 'session-token',
                userId: 'user-1',
                expires: new Date() as unknown as Date & string,
            },
            user: {
                id: 'user-1',
                email: 'user@example.com',
                emailVerified: null,
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
            },
            newSession: {},
            token: {
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
