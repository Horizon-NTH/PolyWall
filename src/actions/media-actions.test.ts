import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

vi.mock('@/lib/storage/storage-service', () => ({
    getStorageService: () => ({
        deleteObject: vi.fn(),
    }),
}));

describe('media-actions', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.mediaItem.findFirst.mockReset();
        prisma.mediaItem.update.mockReset();
        prisma.mediaItem.delete.mockReset();
        prisma.playlistItem.findMany.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
    });

    it('rejects unauthenticated update', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);

        const {updateMediaItem} = await import('@/actions/media-actions');
        const result = await updateMediaItem('media-1', {
            title: 'Affiche',
            description: 'Description',
            durationSeconds: 10,
            active: true,
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects media outside organization', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.findFirst.mockResolvedValueOnce(null);

        const {updateMediaItem} = await import('@/actions/media-actions');
        const result = await updateMediaItem('media-1', {
            title: 'Affiche',
            description: 'Description',
            durationSeconds: 10,
            active: true,
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Média introuvable.',
        });
    });

    it('rejects update when ability cannot update media items', async () => {
        const {auth} = await getAuthMocks();
        const {defineAbilityFor} = await getCaslMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        defineAbilityFor.mockReturnValue({
            can: vi.fn((action: string, subject: string) => action === 'read' && subject === 'MediaItem'),
        });

        const {updateMediaItem} = await import('@/actions/media-actions');
        const result = await updateMediaItem('media-1', {
            title: 'Affiche MAJ',
            description: 'Description MAJ',
            durationSeconds: 12,
            active: false,
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('updates media metadata', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.findFirst.mockResolvedValueOnce({
            id: 'media-1',
            active: true,
            files: [],
        });
        prisma.mediaItem.update.mockResolvedValueOnce({id: 'media-1'});

        const {updateMediaItem} = await import('@/actions/media-actions');
        const result = await updateMediaItem('media-1', {
            title: 'Affiche MAJ',
            description: 'Description MAJ',
            durationSeconds: 12,
            active: false,
        });

        expect(result).toEqual({ok: true, mediaItemId: 'media-1'});
        expect(prisma.mediaItem.update).toHaveBeenCalledWith({
            where: {id: 'media-1'},
            data: {
                title: 'Affiche MAJ',
                description: 'Description MAJ',
                durationSeconds: 12,
                active: false,
            },
            select: {id: true},
        });
    });

    it('toggles media active status', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.findFirst.mockResolvedValueOnce({
            id: 'media-1',
            active: true,
            files: [],
        });
        prisma.mediaItem.update.mockResolvedValueOnce({id: 'media-1'});

        const {toggleMediaItemActive} = await import('@/actions/media-actions');
        const result = await toggleMediaItemActive('media-1');

        expect(result).toEqual({ok: true, mediaItemId: 'media-1'});
        expect(prisma.mediaItem.update).toHaveBeenCalledWith({
            where: {id: 'media-1'},
            data: {active: false},
            select: {id: true},
        });
    });

    it('deletes media item and returns success', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.findFirst.mockResolvedValueOnce({
            id: 'media-1',
            active: true,
            files: [{id: 'mf-1', storageBucket: 'b', objectKey: 'k'}],
        });
        prisma.playlistItem.findMany.mockResolvedValueOnce([]);
        prisma.mediaItem.delete.mockResolvedValueOnce({id: 'media-1'});

        const {deleteMediaItem} = await import('@/actions/media-actions');
        const result = await deleteMediaItem('media-1');

        expect(result).toEqual({ok: true, mediaItemId: 'media-1'});
        expect(prisma.mediaItem.delete).toHaveBeenCalledWith({
            where: {id: 'media-1'},
            select: {id: true},
        });
    });

    it('blocks deletion when media is still used in playlists', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.findFirst.mockResolvedValueOnce({
            id: 'media-1',
            active: true,
            files: [{id: 'mf-1', storageBucket: 'b', objectKey: 'k'}],
        });
        prisma.playlistItem.findMany.mockResolvedValueOnce([
            {playlist: {name: 'Actus'}},
            {playlist: {name: 'Événements'}},
        ]);

        const {deleteMediaItem} = await import('@/actions/media-actions');
        const result = await deleteMediaItem('media-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Suppression impossible: ce média est utilisé dans 2 playlists (Actus, Événements).',
        });
        expect(prisma.mediaItem.delete).not.toHaveBeenCalled();
    });
});
