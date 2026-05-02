import { vi } from 'vitest';

export const mockCaslModule = () => {
    vi.doMock('@/lib/casl/ability', () => ({
        defineAbilityFor: vi.fn(),
    }));
};

export const getCaslMocks = async () => {
    const mod = await import('@/lib/casl/ability');
    return mod as unknown as {
        defineAbilityFor: ReturnType<typeof vi.fn>;
    };
};
