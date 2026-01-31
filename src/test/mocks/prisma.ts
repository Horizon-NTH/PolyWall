import { vi } from 'vitest';

export const mockPrismaModule = () => {
    vi.mock('@/lib/prisma', () => ({
        prisma: {
            user: {
                findUnique: vi.fn(),
            },
            organization: {
                findUnique: vi.fn(),
            },
        },
    }));
};

export const getPrismaMock = async () => {
    const { prisma } = await import('@/lib/prisma');
    return prisma as unknown as {
        user: {
            findUnique: ReturnType<typeof vi.fn>;
        };
        organization: {
            findUnique: ReturnType<typeof vi.fn>;
        };
    };
};
