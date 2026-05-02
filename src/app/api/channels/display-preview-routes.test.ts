import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    defineAbilityFor: vi.fn(),
    getDisplayRuntimeSnapshotByChannelId: vi.fn(),
    logger: {
        success: vi.fn(),
        invalid: vi.fn(),
        denied: vi.fn(),
        error: vi.fn(),
    },
    createActionLogger: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/casl/ability', () => ({
    defineAbilityFor: mocks.defineAbilityFor,
}));

vi.mock('@/lib/screens/display-runtime-snapshot', () => ({
    getDisplayRuntimeSnapshotByChannelId: mocks.getDisplayRuntimeSnapshotByChannelId,
}));

vi.mock('@/actions/action-logging', () => ({
    createActionLogger: mocks.createActionLogger,
}));

function buildSession() {
    return {
        user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User Example',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
        },
        expires: new Date().toISOString(),
    };
}

describe('channel display preview API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        mocks.createActionLogger.mockReturnValue(mocks.logger);
    });

    it('returns 401 when unauthenticated', async () => {
        mocks.auth.mockResolvedValueOnce(null);
        const mod = await import('@/app/api/channels/[channelId]/display-preview/route');

        const response = await mod.GET(new Request('http://localhost/api/channels/channel-1/display-preview'), {
            params: Promise.resolve({channelId: 'channel-1'}),
        });

        expect(response.status).toBe(401);
    });

    it('returns the runtime snapshot for an accessible channel', async () => {
        mocks.auth.mockResolvedValueOnce(buildSession());
        mocks.getDisplayRuntimeSnapshotByChannelId.mockResolvedValueOnce({
            revision: 'rev-1',
            serverNow: '2026-04-27T10:00:00.000Z',
            screen: {
                screenId: 'channel-preview:channel-1',
                channelId: 'channel-1',
                interactive: false,
                interactiveUrl: null,
                inactivityTimeoutSeconds: null,
            },
            channel: {
                id: 'channel-1',
                name: 'Hall',
                timezone: 'Europe/Paris',
                template: {
                    id: 'template-1',
                    name: 'Plein écran',
                    templateKey: 'fullscreen',
                    resolutionX: 1920,
                    resolutionY: 1080,
                    zones: [],
                },
            },
            schedules: [],
            playlists: [],
        });

        const mod = await import('@/app/api/channels/[channelId]/display-preview/route');
        const response = await mod.GET(new Request('http://localhost/api/channels/channel-1/display-preview'), {
            params: Promise.resolve({channelId: 'channel-1'}),
        });

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.snapshot.revision).toBe('rev-1');
        expect(mocks.getDisplayRuntimeSnapshotByChannelId).toHaveBeenCalledWith('channel-1', 'org-1');
    });
});
