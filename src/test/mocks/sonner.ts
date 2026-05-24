import { vi } from 'vitest';

const toastMocks = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: toastMocks,
}));

export const toastMock = toastMocks;

export const resetToastMocks = () => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
    toastMocks.warning.mockReset();
    toastMocks.promise.mockReset();
    toastMocks.dismiss.mockReset();
};
