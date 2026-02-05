import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getArgon2Mock, getAuthMocks, mockArgon2Module, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { UserRole } from '@/generated/prisma/enums';

mockAuthModule();
mockPrismaModule();
mockCaslModule();
mockArgon2Module();

const baseUserPayload = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Gestionnaire principal',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    active: true,
};

describe('createUser', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.create.mockReset();
        argon2.hash.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
    });

    it('rejects unauthenticated users', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser(baseUserPayload);

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser(baseUserPayload);

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects missing organization', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: null}}));
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser(baseUserPayload);

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Aucune organisation sélectionnée.',
        });
    });

    it('returns the first validation error', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser({
            ...baseUserPayload,
            fullName: 'A',
        });

        expect(result).toEqual({
            ok: false,
            field: 'fullName',
            message: 'Le nom complet doit contenir au moins 2 caractères',
        });
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps unique constraint errors', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        prisma.user.create.mockRejectedValueOnce({code: 'P2002'});
        const argon2 = await getArgon2Mock();
        argon2.hash.mockResolvedValueOnce('hash');
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser(baseUserPayload);

        expect(result).toEqual({
            ok: false,
            field: 'email',
            message: 'Cet email est déjà utilisé.',
        });
    });

    it('creates the user on success', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        prisma.user.create.mockResolvedValueOnce({id: 'user-1'});
        const argon2 = await getArgon2Mock();
        argon2.hash.mockResolvedValueOnce('hash');
        const {createUser} = await import('@/actions/user-actions');

        const result = await createUser(baseUserPayload);

        expect(result).toEqual({ok: true, userId: 'user-1'});
        expect(argon2.hash).toHaveBeenCalledWith('Password123!');
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                fullName: baseUserPayload.fullName,
                email: baseUserPayload.email,
                description: baseUserPayload.description,
                role: UserRole.CONTENT_MANAGER,
                organizationId: 'org-1',
                passwordHash: 'hash',
                active: true,
            },
            select: {id: true},
        });
    });
});

const setupDeps = async () => {
    const {auth} = await getAuthMocks();
    const prisma = await getPrismaMock();
    const {defineAbilityFor} = await getCaslMocks();

    auth.mockReset();
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
    defineAbilityFor.mockReset();
    defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

    return {auth, prisma, defineAbilityFor};
};

describe('updateUser', () => {
    const buildUpdatePayload = (overrides?: Partial<{
        fullName: string;
        email: string;
        description: string;
        active: boolean;
    }>) => ({
        fullName: 'User',
        email: 'user@example.com',
        description: 'Desc',
        active: true,
        ...(overrides ?? {}),
    });

    it('rejects unauthenticated users', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(null);
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects missing organization', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: null}}));
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Aucune organisation sélectionnée.',
        });
    });

    it('rejects invalid payload', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload({fullName: 'A'}));

        expect(result).toEqual({
            ok: false,
            field: 'fullName',
            message: 'Le nom complet doit contenir au moins 2 caractères',
        });
    });

    it('rejects missing user', async () => {
        const {auth, prisma} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Utilisateur introuvable.',
        });
    });

    it('updates the user on success', async () => {
        const {auth, prisma} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: true,
        });
        prisma.user.update.mockResolvedValueOnce({id: 'user-1'});
        const {updateUser} = await import('@/actions/user-actions');

        const result = await updateUser('user-1', buildUpdatePayload());

        expect(result).toEqual({ok: true, userId: 'user-1'});
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: {id: 'user-1'},
            data: {
                fullName: 'User',
                email: 'user@example.com',
                description: 'Desc',
                active: true,
            },
            select: {id: true},
        });
    });
});

describe('toggleUserActive', () => {
    it('rejects unauthenticated users', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(null);
        const {toggleUserActive} = await import('@/actions/user-actions');

        const result = await toggleUserActive('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});
        const {toggleUserActive} = await import('@/actions/user-actions');

        const result = await toggleUserActive('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects own status changes', async () => {
        const {auth} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-1'}}));
        const {toggleUserActive} = await import('@/actions/user-actions');

        const result = await toggleUserActive('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous ne pouvez pas modifier votre propre statut.',
        });
    });

    it('rejects when user is outside organization', async () => {
        const {auth, prisma} = await setupDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-2'}}));
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-2',
            active: true,
        });
        const {toggleUserActive} = await import('@/actions/user-actions');

        const result = await toggleUserActive('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Utilisateur introuvable.',
        });
    });
});

describe('deleteUser', () => {
    const setupDeleteDeps = async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.findUnique.mockReset();
        prisma.user.delete.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        return {auth, prisma, defineAbilityFor};
    };

    it('rejects unauthenticated users', async () => {
        const {auth} = await setupDeleteDeps();
        auth.mockResolvedValueOnce(null);
        const {deleteUser} = await import('@/actions/user-actions');

        const result = await deleteUser('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const {auth} = await setupDeleteDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});
        const {deleteUser} = await import('@/actions/user-actions');

        const result = await deleteUser('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects own deletion', async () => {
        const {auth} = await setupDeleteDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-1'}}));
        const {deleteUser} = await import('@/actions/user-actions');

        const result = await deleteUser('user-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous ne pouvez pas supprimer votre propre compte.',
        });
    });

    it('deletes the user on success', async () => {
        const {auth, prisma} = await setupDeleteDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-2'}}));
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-1',
            role: UserRole.CONTENT_MANAGER,
            organizationId: 'org-1',
            active: true,
        });
        prisma.user.delete.mockResolvedValueOnce({id: 'user-1'});
        const {deleteUser} = await import('@/actions/user-actions');

        const result = await deleteUser('user-1');

        expect(result).toEqual({ok: true});
        expect(prisma.user.delete).toHaveBeenCalledWith({
            where: {id: 'user-1'},
        });
    });
});
