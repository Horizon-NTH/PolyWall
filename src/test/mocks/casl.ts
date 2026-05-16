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

export const resetCaslMocks = async (can: boolean | ((action: string, subject: string) => boolean) = true) => {
    const mocks = await getCaslMocks();
    mocks.defineAbilityFor.mockReset();
    mocks.defineAbilityFor.mockReturnValue({
        can: vi.fn(typeof can === 'function' ? can : () => can),
    });
    return mocks;
};
