import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScreenPairingCard } from '@/components/screens/screen-pairing-card';

const refreshMock = vi.fn();
const createScreenPairingTokenMock = vi.fn();
const getActiveScreenPairingTokenStateMock = vi.fn();
const revokeActiveScreenPairingTokenMock = vi.fn();
const storageData = new Map<string, string>();
const localStorageMock = {
    getItem: vi.fn((key: string) => storageData.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
        storageData.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
        storageData.delete(key);
    }),
};

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
}));

vi.mock('@/actions/screen-actions', () => ({
    createScreenPairingToken: (...args: unknown[]) => createScreenPairingTokenMock(...args),
    getActiveScreenPairingTokenState: (...args: unknown[]) => getActiveScreenPairingTokenStateMock(...args),
    revokeActiveScreenPairingToken: (...args: unknown[]) => revokeActiveScreenPairingTokenMock(...args),
}));

describe('ScreenPairingCard', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        createScreenPairingTokenMock.mockReset();
        getActiveScreenPairingTokenStateMock.mockReset();
        revokeActiveScreenPairingTokenMock.mockReset();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        storageData.clear();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            configurable: true,
        });
        getActiveScreenPairingTokenStateMock.mockResolvedValue({ok: true, hasActiveToken: false});
        revokeActiveScreenPairingTokenMock.mockResolvedValue({ok: true});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('restores OTP code from local storage when still valid', async () => {
        window.localStorage.setItem(
            'polywall.screen.pairing-otp.org-1',
            JSON.stringify({
                otpCode: '123456',
                expiresAt: '2099-01-01T00:00:00.000Z',
            }),
        );

        render(<ScreenPairingCard organizationId="org-1" />);

        expect(await screen.findByDisplayValue('123456')).toBeInTheDocument();
    });

    it('shows warning when active token exists but no local code', async () => {
        getActiveScreenPairingTokenStateMock.mockResolvedValueOnce({
            ok: true,
            hasActiveToken: true,
            expiresAt: '2099-01-01T00:00:00.000Z',
        });

        render(<ScreenPairingCard organizationId="org-1" />);

        expect(await screen.findByText(/déjà actif côté serveur/i)).toBeInTheDocument();
    });

    it('refreshes page while OTP is active', async () => {
        const setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(
            ((callback: TimerHandler) => {
                if (typeof callback === 'function') callback();
                return 1 as unknown as ReturnType<typeof setInterval>;
            }) as unknown as typeof window.setInterval,
        );
        vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
        window.localStorage.setItem(
            'polywall.screen.pairing-otp.org-1',
            JSON.stringify({
                otpCode: '123456',
                expiresAt: '2099-01-01T00:00:00.000Z',
            }),
        );

        render(<ScreenPairingCard organizationId="org-1" />);
        await waitFor(() => expect(screen.getByDisplayValue('123456')).toBeInTheDocument());

        expect(refreshMock).toHaveBeenCalled();
        expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('revokes active OTP and clears local storage', async () => {
        window.localStorage.setItem(
            'polywall.screen.pairing-otp.org-1',
            JSON.stringify({
                otpCode: '123456',
                expiresAt: '2099-01-01T00:00:00.000Z',
            }),
        );

        render(<ScreenPairingCard organizationId="org-1" />);
        expect(await screen.findByDisplayValue('123456')).toBeInTheDocument();

        const removeSpy = vi.spyOn(window.localStorage, 'removeItem');
        const button = screen.getByRole('button', {name: 'Supprimer le code actif'});
        await waitFor(() => {
            expect(button).toBeEnabled();
        });
        fireEvent.click(button);

        await waitFor(() => {
            expect(revokeActiveScreenPairingTokenMock).toHaveBeenCalled();
        });
        expect(removeSpy).toHaveBeenCalledWith('polywall.screen.pairing-otp.org-1');
    });

    it('reloads token state when the organization changes', async () => {
        getActiveScreenPairingTokenStateMock
            .mockResolvedValueOnce({
                ok: true,
                hasActiveToken: true,
                expiresAt: '2099-01-01T00:00:00.000Z',
            })
            .mockResolvedValueOnce({
                ok: true,
                hasActiveToken: false,
            });

        const {rerender} = render(<ScreenPairingCard organizationId="org-1" />);

        expect(await screen.findByText(/déjà actif côté serveur/i)).toBeInTheDocument();

        rerender(<ScreenPairingCard organizationId="org-2" />);

        await waitFor(() => {
            expect(screen.queryByText(/déjà actif côté serveur/i)).not.toBeInTheDocument();
        });
        expect(window.localStorage.getItem).toHaveBeenCalledWith('polywall.screen.pairing-otp.org-2');
        expect(getActiveScreenPairingTokenStateMock).toHaveBeenCalledTimes(2);
    });
});
