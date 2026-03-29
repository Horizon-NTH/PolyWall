import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DisplayClient } from '@/components/screens/display-client';

vi.mock('@/components/ui/input-otp', () => ({
    InputOTP: ({
        value,
        onChange,
        children,
        ...props
    }: React.ComponentProps<'div'> & {value?: string; onChange?: (value: string) => void}) => (
        <div {...props}>
            <input
                data-testid="otp-input"
                value={value ?? ''}
                onChange={(event) => onChange?.(event.target.value)}
            />
            {children}
        </div>
    ),
    InputOTPGroup: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
    InputOTPSeparator: () => null,
    InputOTPSlot: () => null,
}));

describe('DisplayClient OTP flow', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
            window.localStorage.removeItem('polywall.screen.deviceId');
        }
    });

    it('disables submit while OTP is incomplete', async () => {
        const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify({error: 'Écran introuvable.'}), {status: 404});
            }
            return new Response(JSON.stringify({error: 'Code OTP invalide.'}), {status: 401});
        });

        render(<DisplayClient />);

        await screen.findByText(/Saisissez le code.*6 chiffres/i);
        const button = screen.getByRole('button', {name: 'Valider le code'});
        expect(button).toBeDisabled();

        fireEvent.change(screen.getByTestId('otp-input'), {target: {value: '12345'}});
        expect(button).toBeDisabled();

        expect(fetchMock).toHaveBeenCalled();
    });

    it('submits OTP and shows API error message for invalid code', async () => {
        const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify({error: 'Écran introuvable.'}), {status: 404});
            }
            if (url.includes('/api/display/pair') && init?.method === 'POST') {
                return new Response(JSON.stringify({error: 'Code OTP invalide.'}), {status: 401});
            }
            return new Response(JSON.stringify({error: 'Unexpected'}), {status: 500});
        });

        render(<DisplayClient />);

        await screen.findByText(/Saisissez le code.*6 chiffres/i);
        fireEvent.change(screen.getByTestId('otp-input'), {target: {value: '123456'}});
        fireEvent.click(screen.getByRole('button', {name: 'Valider le code'}));

        await waitFor(() => {
            expect(screen.getByText('Code OTP invalide.')).toBeInTheDocument();
        });

        expect(fetchMock).toHaveBeenCalled();
    });
});
