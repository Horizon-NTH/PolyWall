import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { NavUser } from '@/components/sidebar/nav-user';
import { SidebarProvider } from '@/components/ui/sidebar';

const signOutMock = vi.fn();

vi.mock('next-auth/react', () => ({
    signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe('NavUser', () => {
    beforeEach(() => {
        signOutMock.mockReset();
    });

    it('shows account link and logout action', async () => {
        render(
            <SidebarProvider>
                <NavUser
                    user={{
                        name: 'Jean Dupont',
                        email: 'jean@example.com',
                        avatar: '',
                    }}
                />
            </SidebarProvider>,
        );

        const trigger = screen.getByRole('button', {name: /Jean Dupont/i});
        fireEvent.pointerDown(trigger);
        fireEvent.click(trigger);

        const accountText = await screen.findByText('Compte');
        const accountItem = accountText.closest('[role="menuitem"]');
        expect(accountItem).not.toBeNull();
        const accountLink = accountItem?.querySelector('a') ?? accountItem;
        expect(accountLink).not.toBeNull();
        expect(accountLink).toHaveAttribute('href', '/dashboard/account');

        const logoutText = await screen.findByText('Déconnexion');
        fireEvent.click(logoutText);

        expect(signOutMock).toHaveBeenCalledWith({redirectTo: '/login'});
    });
});
