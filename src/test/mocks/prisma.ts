import { vi } from 'vitest';

export const mockPrismaModule = () => {
    vi.mock('@/lib/prisma', () => ({
        prisma: {
            user: {
                findUnique: vi.fn(),
                update: vi.fn(),
                create: vi.fn(),
                count: vi.fn(),
                delete: vi.fn(),
            },
            organization: {
                findUnique: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            mediaItem: {
                findFirst: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                count: vi.fn(),
            },
            playlist: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            channel: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            displayTemplate: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
            screen: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                updateMany: vi.fn(),
            },
            screenPairingToken: {
                create: vi.fn(),
                findFirst: vi.fn(),
                findUnique: vi.fn(),
                updateMany: vi.fn(),
            },
            playlistItem: {
                deleteMany: vi.fn(),
                createMany: vi.fn(),
            },
            playlistSchedule: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            $transaction: vi.fn(),
        },
    }));
};

export const getPrismaMock = async () => {
    const {prisma} = await import('@/lib/prisma');
    return prisma as unknown as {
        user: {
            findUnique: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            count: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
        };
        organization: {
            findUnique: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
        };
        mediaItem: {
            findFirst: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
            count: ReturnType<typeof vi.fn>;
        };
        playlist: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
        };
        channel: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
        };
        displayTemplate: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
        };
        screen: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
            updateMany: ReturnType<typeof vi.fn>;
        };
        screenPairingToken: {
            create: ReturnType<typeof vi.fn>;
            findFirst: ReturnType<typeof vi.fn>;
            findUnique: ReturnType<typeof vi.fn>;
            updateMany: ReturnType<typeof vi.fn>;
        };
        playlistItem: {
            deleteMany: ReturnType<typeof vi.fn>;
            createMany: ReturnType<typeof vi.fn>;
        };
        playlistSchedule: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
        };
        $transaction: ReturnType<typeof vi.fn>;
    };
};
