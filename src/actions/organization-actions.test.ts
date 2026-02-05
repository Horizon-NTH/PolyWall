import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';

mockAuthModule();
mockPrismaModule();
mockCaslModule();

describe('switchOrganization', () => {
    beforeEach(async () => {
        const { auth, unstable_update } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();

        auth.mockReset();
        unstable_update.mockReset();
        prisma.organization.findUnique.mockReset();
        prisma.organization.create.mockReset();
        prisma.organization.update.mockReset();
        prisma.organization.delete.mockReset();
        defineAbilityFor.mockReset();
    });

    it('rejects invalid organizationId', async () => {
        const { auth } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('');

        expect(result).toEqual({ ok: false });
        expect(auth).not.toHaveBeenCalled();
        expect(defineAbilityFor).not.toHaveBeenCalled();
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated users', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-1');

        expect(result).toEqual({ ok: false });
    });

    it('rejects when user cannot switch organizations', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => false) });
        const prisma = await getPrismaMock();
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-1');

        expect(result).toEqual({ ok: false });
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects unknown organizations', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce(null);
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('missing-org');

        expect(result).toEqual({ ok: false });
        expect(prisma.organization.findUnique).toHaveBeenCalledWith({
            where: { id: 'missing-org' },
            select: { id: true },
        });
    });

    it('updates the session when switching organizations succeeds', async () => {
        const { auth, unstable_update } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org-2' });
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-2');

        expect(result).toEqual({ ok: true });
        expect(unstable_update).toHaveBeenCalledWith({
            user: { organizationId: 'org-2' },
        });
    });
});

describe('createOrganization', () => {
    beforeEach(async () => {
        const { auth } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();

        auth.mockReset();
        prisma.organization.create.mockReset();
        defineAbilityFor.mockReset();
    });

    it('rejects unauthenticated users', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const { createOrganization } = await import('@/actions/organization-actions');

        const result = await createOrganization({ name: 'Org', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => false) });
        const { createOrganization } = await import('@/actions/organization-actions');

        const result = await createOrganization({ name: 'Org', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('returns the first validation error', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        const { createOrganization } = await import('@/actions/organization-actions');

        const result = await createOrganization({ name: 'A', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'name',
            message: 'Le nom doit contenir au moins 2 caractères.',
        });
        expect(prisma.organization.create).not.toHaveBeenCalled();
    });

    it('maps Prisma unique constraint errors', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.create.mockRejectedValueOnce({ code: 'P2002' });
        const { createOrganization } = await import('@/actions/organization-actions');

        const result = await createOrganization({ name: 'Org', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'name',
            message: 'Le nom est déjà utilisé.',
        });
    });

    it('creates the organization on success', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.create.mockResolvedValueOnce({ id: 'org-1' });
        const { createOrganization } = await import('@/actions/organization-actions');

        const result = await createOrganization({
            name: 'Org',
            description: 'Desc',
        });

        expect(result).toEqual({ ok: true, organizationId: 'org-1' });
        expect(prisma.organization.create).toHaveBeenCalledWith({
            data: { name: 'Org', description: 'Desc' },
            select: { id: true },
        });
    });
});

describe('updateOrganization', () => {
    beforeEach(async () => {
        const { auth } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();

        auth.mockReset();
        prisma.organization.update.mockReset();
        defineAbilityFor.mockReset();
    });

    it('rejects unauthenticated users', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('org-1', {
            name: 'Org',
            description: 'Desc',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects empty organization ids', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('', { name: 'Org', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Organisation introuvable.',
        });
    });

    it('rejects users without permission', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => false) });
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('org-1', { name: 'Org', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('returns the first validation error', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('org-1', { name: 'A', description: 'Desc' });

        expect(result).toEqual({
            ok: false,
            field: 'name',
            message: 'Le nom doit contenir au moins 2 caractères.',
        });
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('maps Prisma unique constraint errors', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.update.mockRejectedValueOnce({ code: 'P2002' });
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('org-1', {
            name: 'Org',
            description: 'Desc',
        });

        expect(result).toEqual({
            ok: false,
            field: 'name',
            message: 'Le nom est déjà utilisé.',
        });
    });

    it('updates the organization on success', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.update.mockResolvedValueOnce({ id: 'org-1' });
        const { updateOrganization } = await import('@/actions/organization-actions');

        const result = await updateOrganization('org-1', {
            name: 'Org',
            description: 'Desc',
        });

        expect(result).toEqual({ ok: true, organizationId: 'org-1' });
        expect(prisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'org-1' },
            data: { name: 'Org', description: 'Desc' },
            select: { id: true },
        });
    });
});

describe('deleteOrganization', () => {
    beforeEach(async () => {
        const { auth } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();

        auth.mockReset();
        prisma.organization.findUnique.mockReset();
        prisma.organization.delete.mockReset();
        defineAbilityFor.mockReset();
    });

    it('rejects invalid organization ids', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const prisma = await getPrismaMock();
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Organisation introuvable.',
        });
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated users', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('org-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects users without permission', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => false) });
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('org-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects missing organizations', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce(null);
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('missing-org');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Organisation introuvable.',
        });
    });

    it('rejects when linked data exists', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce({
            _count: {
                users: 1,
                screens: 0,
                channels: 0,
                playlists: 0,
                displayTemplates: 0,
                widgetInstances: 0,
            },
        });
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('org-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message:
                "Supprimez d'abord les données liées avant de supprimer l'organisation.",
        });
        expect(prisma.organization.delete).not.toHaveBeenCalled();
    });

    it('deletes the organization when no linked data exists', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce({
            _count: {
                users: 0,
                screens: 0,
                channels: 0,
                playlists: 0,
                displayTemplates: 0,
                widgetInstances: 0,
            },
        });
        const { deleteOrganization } = await import('@/actions/organization-actions');

        const result = await deleteOrganization('org-1');

        expect(result).toEqual({ ok: true });
        expect(prisma.organization.delete).toHaveBeenCalledWith({
            where: { id: 'org-1' },
        });
    });
});
