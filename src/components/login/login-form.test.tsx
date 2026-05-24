import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/login/login-form';
import { routerMock, setMockSearchParams } from '@/test/mocks/next-navigation';

const signInMock = vi.fn();

vi.mock('next-auth/react', () => ({
    signIn: (...args: unknown[]) => signInMock(...args),
}));

describe('LoginForm', () => {
    beforeEach(() => {
        setMockSearchParams('callbackUrl=/welcome');
        signInMock.mockReset();
    });

    it('shows an error when credentials are invalid', async () => {
        signInMock.mockResolvedValueOnce({error: 'CredentialsSignin'});

        render(<LoginForm />);

        fireEvent.change(screen.getByLabelText('Email'), {
            target: {value: 'wrong@example.com'},
        });
        fireEvent.change(screen.getByLabelText('Mot de passe'), {
            target: {value: 'wrong-password'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Se connecter'}));

        await waitFor(() => {
            expect(
                screen.getByText('Email ou mot de passe incorrect'),
            ).toBeInTheDocument();
        });
    });

    it('redirects to callbackUrl after successful login', async () => {
        signInMock.mockResolvedValueOnce({ok: true, url: '/welcome'});

        render(<LoginForm />);

        fireEvent.change(screen.getByLabelText('Email'), {
            target: {value: 'user@example.com'},
        });
        fireEvent.change(screen.getByLabelText('Mot de passe'), {
            target: {value: 'password123'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Se connecter'}));

        await waitFor(() => {
            expect(signInMock).toHaveBeenCalledWith(
                'credentials',
                expect.objectContaining({
                    email: 'user@example.com',
                    password: 'password123',
                    callbackUrl: '/welcome',
                    redirect: false,
                }),
            );
        });

        await waitFor(() => {
            expect(routerMock.replace).toHaveBeenCalledWith('/welcome');
        });
    });
});
