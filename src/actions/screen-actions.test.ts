import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

describe('screen-actions', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        prisma.screen.findFirst.mockReset();
        prisma.screen.update.mockReset();
        prisma.screen.delete.mockReset();
        prisma.screenPairingToken.create.mockReset();
        prisma.screenPairingToken.findFirst.mockReset();
        prisma.channel.findFirst.mockReset();
    });

    it('rejects unauthenticated pairing token creation', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);

        const {createScreenPairingToken} = await import('@/actions/screen-actions');
        const result = await createScreenPairingToken();

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('creates OTP code', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screenPairingToken.create.mockResolvedValueOnce({id: 'pair-1'});

        const {createScreenPairingToken} = await import('@/actions/screen-actions');
        const result = await createScreenPairingToken();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.otpCode).toMatch(/^\d{6}$/);
        }
    });

    it('returns active pairing token state', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screenPairingToken.findFirst.mockResolvedValueOnce({
            expiresAt: new Date('2026-01-01T12:00:00.000Z'),
        });

        const {getActiveScreenPairingTokenState} = await import('@/actions/screen-actions');
        const result = await getActiveScreenPairingTokenState();

        expect(result).toEqual({
            ok: true,
            hasActiveToken: true,
            expiresAt: '2026-01-01T12:00:00.000Z',
        });
    });

    it('revokes active pairing token', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screenPairingToken.updateMany.mockResolvedValueOnce({count: 1});

        const {revokeActiveScreenPairingToken} = await import('@/actions/screen-actions');
        const result = await revokeActiveScreenPairingToken();

        expect(result).toEqual({ok: true});
        expect(prisma.screenPairingToken.updateMany).toHaveBeenCalled();
    });

    it('rejects approve when screen is missing', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screen.findFirst.mockResolvedValueOnce(null);

        const {approvePendingScreen} = await import('@/actions/screen-actions');
        const result = await approvePendingScreen('screen-1', {
            name: 'Hall #1',
            location: 'Entrée',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: '',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Écran introuvable.',
        });
    });

    it('approves a pending screen', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'PENDING',
            organizationId: 'org-1',
            channelId: null,
            name: 'tmp',
        });
        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1'});
        prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const {approvePendingScreen} = await import('@/actions/screen-actions');
        const result = await approvePendingScreen('screen-1', {
            name: 'Hall #1',
            location: 'Entrée',
            channelId: 'channel-1',
            interactive: true,
            interactiveUrl: 'https://example.com',
            inactivityTimeoutSeconds: 60,
        });

        expect(result).toEqual({ok: true, screenId: 'screen-1'});
    });

    it('rejects update without permission', async () => {
        const {auth} = await getAuthMocks();
        const {defineAbilityFor} = await getCaslMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        defineAbilityFor.mockReturnValueOnce({can: vi.fn(() => false)});

        const {updateScreen} = await import('@/actions/screen-actions');
        const result = await updateScreen('screen-1', {
            name: 'Hall #1',
            location: 'Entrée',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: '',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('rejects reactivate with channel outside org', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'REVOKED',
            organizationId: 'org-1',
            channelId: null,
            name: 'screen',
        });
        prisma.channel.findFirst.mockResolvedValueOnce(null);

        const {reactivateScreen} = await import('@/actions/screen-actions');
        const result = await reactivateScreen('screen-1', {channelId: 'channel-2'});

        expect(result).toEqual({
            ok: false,
            field: 'channelId',
            message: 'Canal introuvable.',
        });
    });

    it('deletes screen in organization scope', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            organizationId: 'org-1',
            channelId: 'channel-1',
            name: 'screen',
        });
        prisma.screen.delete.mockResolvedValueOnce({id: 'screen-1'});

        const {deleteScreen} = await import('@/actions/screen-actions');
        const result = await deleteScreen('screen-1');

        expect(result).toEqual({ok: true, screenId: 'screen-1'});
        expect(prisma.screen.delete).toHaveBeenCalledWith({
            where: {id: 'screen-1'},
            select: {id: true},
        });
    });
});
