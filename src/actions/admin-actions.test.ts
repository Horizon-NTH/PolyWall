import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getArgon2Mock, getAuthMocks, mockArgon2Module, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { UserRole } from '@/generated/prisma/enums';

mockAuthModule();
mockPrismaModule();
mockCaslModule();
mockArgon2Module();

const baseAdminPayload = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Administrateur principal',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    organizationId: null,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    active: true,
};

describe('createAdmin', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.create.mockReset();
        prisma.organization.findUnique.mockReset();
        argon2.hash.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
    });

    it('rejects unauthenticated users', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin(baseAdminPayload);

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
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin(baseAdminPayload);

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('returns the first validation error', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin({
            ...baseAdminPayload,
            fullName: 'A',
        });

        expect(result).toEqual({
            ok: false,
            field: 'fullName',
            message: 'Le nom complet doit contenir au moins 2 caractères',
        });
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects missing organizations for organization admins', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce(null);
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin({
            ...baseAdminPayload,
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'organizationId',
            message: 'Organisation introuvable.',
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
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin(baseAdminPayload);

        expect(result).toEqual({
            ok: false,
            field: 'email',
            message: 'Cet email est déjà utilisé.',
        });
    });

    it('creates the admin on success', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        prisma.user.create.mockResolvedValueOnce({id: 'admin-1'});
        const argon2 = await getArgon2Mock();
        argon2.hash.mockResolvedValueOnce('hash');
        const {createAdmin} = await import('@/actions/admin-actions');

        const result = await createAdmin(baseAdminPayload);

        expect(result).toEqual({ok: true, adminId: 'admin-1'});
        expect(argon2.hash).toHaveBeenCalledWith('Password123!');
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                fullName: baseAdminPayload.fullName,
                email: baseAdminPayload.email,
                description: baseAdminPayload.description,
                role: baseAdminPayload.role,
                organizationId: null,
                passwordHash: 'hash',
                active: true,
            },
            select: {id: true},
        });
    });
});

describe('updateAdmin', () => {
    const buildUpdatePayload = (overrides?: Partial<{
        fullName: string;
        email: string;
        description: string;
        role: UserRole;
        organizationId: string | null;
        active: boolean;
    }>) => ({
        fullName: 'Admin',
        email: 'admin@example.com',
        description: 'Desc',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        organizationId: null,
        active: true,
        ...(overrides ?? {}),
    });

    const setupUpdateAdminDeps = async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.findUnique.mockReset();
        prisma.user.update.mockReset();
        prisma.user.count.mockReset();
        prisma.organization.findUnique.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        return {auth, prisma, defineAbilityFor};
    };

    it('rejects unauthenticated users', async () => {
        const {auth} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(null);
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('admin-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects empty admin ids', async () => {
        const {auth} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Administrateur introuvable.',
        });
    });

    it('rejects users without permission', async () => {
        const {auth, defineAbilityFor} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('admin-1', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('returns the first validation error', async () => {
        const {auth, prisma} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('admin-1', buildUpdatePayload({fullName: 'A'}));

        expect(result).toEqual({
            ok: false,
            field: 'fullName',
            message: 'Le nom complet doit contenir au moins 2 caractères',
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when admin target is missing', async () => {
        const {auth, prisma} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('missing-admin', buildUpdatePayload());

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Administrateur introuvable.',
        });
    });

    it('rejects when removing the last active super admin', async () => {
        const {auth, prisma} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
            active: true,
        });
        prisma.user.count.mockResolvedValueOnce(0);
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin('admin-1', buildUpdatePayload({active: false}));

        expect(result).toEqual({
            ok: false,
            field: 'active',
            message: 'Impossible de désactiver le dernier super admin actif.',
        });
    });

    it('updates the admin on success', async () => {
        const {auth, prisma} = await setupUpdateAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
            active: true,
        });
        prisma.organization.findUnique.mockResolvedValueOnce({id: 'org-1'});
        prisma.user.update.mockResolvedValueOnce({id: 'admin-1'});
        const {updateAdmin} = await import('@/actions/admin-actions');

        const result = await updateAdmin(
            'admin-1',
            buildUpdatePayload({
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
            }),
        );

        expect(result).toEqual({ok: true, adminId: 'admin-1'});
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: {id: 'admin-1'},
            data: {
                fullName: 'Admin',
                email: 'admin@example.com',
                description: 'Desc',
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
                active: true,
            },
            select: {id: true},
        });
    });
});

describe('toggleAdminActive', () => {
    const setupToggleAdminDeps = async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.findUnique.mockReset();
        prisma.user.update.mockReset();
        prisma.user.count.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        return {auth, prisma, defineAbilityFor};
    };

    it('rejects invalid admin ids', async () => {
        const {auth} = await setupToggleAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {toggleAdminActive} = await import('@/actions/admin-actions');

        const result = await toggleAdminActive('');

        expect(result).toMatchObject({
            ok: false,
            field: 'adminId',
        });
    });

    it('rejects when toggling your own status', async () => {
        const {auth, defineAbilityFor} = await setupToggleAdminDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'admin-1'}}));
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const {toggleAdminActive} = await import('@/actions/admin-actions');

        const result = await toggleAdminActive('admin-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous ne pouvez pas modifier votre propre statut.',
        });
    });

    it('rejects when admin target is missing', async () => {
        const {auth, prisma} = await setupToggleAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const {toggleAdminActive} = await import('@/actions/admin-actions');

        const result = await toggleAdminActive('missing-admin');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Administrateur introuvable.',
        });
    });

    it('rejects when disabling the last active super admin', async () => {
        const {auth, prisma} = await setupToggleAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
            active: true,
        });
        prisma.user.count.mockResolvedValueOnce(0);
        const {toggleAdminActive} = await import('@/actions/admin-actions');

        const result = await toggleAdminActive('admin-1');

        expect(result).toEqual({
            ok: false,
            field: 'active',
            message: 'Impossible de désactiver le dernier super admin actif.',
        });
    });

    it('toggles the admin status on success', async () => {
        const {auth, prisma} = await setupToggleAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
            active: false,
        });
        prisma.user.update.mockResolvedValueOnce({id: 'admin-1'});
        const {toggleAdminActive} = await import('@/actions/admin-actions');

        const result = await toggleAdminActive('admin-1');

        expect(result).toEqual({ok: true, adminId: 'admin-1'});
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: {id: 'admin-1'},
            data: {active: true},
            select: {id: true},
        });
    });
});

describe('deleteAdmin', () => {
    const setupDeleteAdminDeps = async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.user.findUnique.mockReset();
        prisma.user.count.mockReset();
        prisma.user.delete.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        return {auth, prisma, defineAbilityFor};
    };

    it('rejects invalid admin ids', async () => {
        const {auth} = await setupDeleteAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        const {deleteAdmin} = await import('@/actions/admin-actions');

        const result = await deleteAdmin('');

        expect(result).toMatchObject({
            ok: false,
            field: 'adminId',
        });
    });

    it('rejects when deleting your own account', async () => {
        const {auth, defineAbilityFor} = await setupDeleteAdminDeps();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'admin-1'}}));
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const {deleteAdmin} = await import('@/actions/admin-actions');

        const result = await deleteAdmin('admin-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous ne pouvez pas supprimer votre propre compte.',
        });
    });

    it('rejects when admin target is missing', async () => {
        const {auth, prisma} = await setupDeleteAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const {deleteAdmin} = await import('@/actions/admin-actions');

        const result = await deleteAdmin('missing-admin');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Administrateur introuvable.',
        });
    });

    it('rejects when deleting the last active super admin', async () => {
        const {auth, prisma} = await setupDeleteAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
            active: true,
        });
        prisma.user.count.mockResolvedValueOnce(0);
        const {deleteAdmin} = await import('@/actions/admin-actions');

        const result = await deleteAdmin('admin-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Impossible de supprimer le dernier super admin actif.',
        });
    });

    it('deletes the admin on success', async () => {
        const {auth, prisma} = await setupDeleteAdminDeps();
        auth.mockResolvedValueOnce(buildSession());
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'admin-1',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
            active: true,
        });
        prisma.user.delete.mockResolvedValueOnce({id: 'admin-1'});
        const {deleteAdmin} = await import('@/actions/admin-actions');

        const result = await deleteAdmin('admin-1');

        expect(result).toEqual({ok: true});
        expect(prisma.user.delete).toHaveBeenCalledWith({
            where: {id: 'admin-1'},
        });
    });
});
