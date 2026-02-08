import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

describe('playlist-actions', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        prisma.playlist.findFirst.mockReset();
        prisma.playlist.create.mockReset();
        prisma.playlist.update.mockReset();
        prisma.playlist.delete.mockReset();
        prisma.playlistItem.deleteMany.mockReset();
        prisma.playlistItem.createMany.mockReset();
        prisma.mediaItem.count.mockReset();
        prisma.$transaction.mockReset();
        prisma.$transaction.mockResolvedValue([]);
    });

    it('rejects unauthenticated create', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);

        const {createPlaylist} = await import('@/actions/playlist-actions');
        const result = await createPlaylist({name: 'Default', description: 'Playlist principale'});

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('creates a playlist', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.playlist.create.mockResolvedValueOnce({id: 'playlist-1'});

        const {createPlaylist} = await import('@/actions/playlist-actions');
        const result = await createPlaylist({name: 'Default', description: 'Playlist principale'});

        expect(result).toEqual({ok: true, playlistId: 'playlist-1'});
        expect(prisma.playlist.create).toHaveBeenCalledWith({
            data: {
                name: 'Default',
                description: 'Playlist principale',
                organizationId: 'org-1',
            },
            select: {id: true},
        });
    });

    it('rejects update when playlist does not belong to current organization', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.playlist.findFirst.mockResolvedValueOnce(null);

        const {updatePlaylist} = await import('@/actions/playlist-actions');
        const result = await updatePlaylist('playlist-1', {name: 'Actus', description: 'Description MAJ'});

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Playlist introuvable.',
        });
    });

    it('deletes a playlist', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.playlist.findFirst.mockResolvedValueOnce({id: 'playlist-1', organizationId: 'org-1'});
        prisma.playlist.delete.mockResolvedValueOnce({id: 'playlist-1'});

        const {deletePlaylist} = await import('@/actions/playlist-actions');
        const result = await deletePlaylist('playlist-1');

        expect(result).toEqual({ok: true, playlistId: 'playlist-1'});
        expect(prisma.playlist.delete).toHaveBeenCalledWith({
            where: {id: 'playlist-1'},
            select: {id: true},
        });
    });

    it('rejects timeline replacement with unknown media', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.playlist.findFirst.mockResolvedValueOnce({id: 'playlist-1', organizationId: 'org-1'});
        prisma.mediaItem.count.mockResolvedValueOnce(1);

        const {replacePlaylistTimeline} = await import('@/actions/playlist-actions');
        const result = await replacePlaylistTimeline('playlist-1', {
            items: [{mediaItemId: 'media-1'}, {mediaItemId: 'media-2'}],
        });

        expect(result).toEqual({
            ok: false,
            field: 'items',
            message: 'Certains médias sont introuvables.',
        });
    });

    it('replaces timeline and preserves duplicates', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.playlist.findFirst.mockResolvedValueOnce({id: 'playlist-1', organizationId: 'org-1'});
        prisma.mediaItem.count.mockResolvedValueOnce(1);
        prisma.playlistItem.deleteMany.mockResolvedValueOnce({count: 2});
        prisma.playlistItem.createMany.mockResolvedValueOnce({count: 2});

        const {replacePlaylistTimeline} = await import('@/actions/playlist-actions');
        const result = await replacePlaylistTimeline('playlist-1', {
            items: [{mediaItemId: 'media-1'}, {mediaItemId: 'media-1'}],
        });

        expect(result).toEqual({ok: true, playlistId: 'playlist-1'});
        expect(prisma.playlistItem.createMany).toHaveBeenCalledWith({
            data: [
                {playlistId: 'playlist-1', mediaItemId: 'media-1', orderIndex: 0},
                {playlistId: 'playlist-1', mediaItemId: 'media-1', orderIndex: 1},
            ],
        });
    });
});
