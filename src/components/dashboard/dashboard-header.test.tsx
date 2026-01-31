import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SidebarProvider } from '@/components/ui/sidebar';

describe('DashboardHeader', () => {
    it('renders breadcrumb links and current page', () => {
        render(
            <SidebarProvider>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Compte'},
                    ]}
                />
            </SidebarProvider>,
        );

        expect(screen.getByRole('button', {name: 'Toggle Sidebar'})).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Tableau de bord'})).toBeInTheDocument();
        const current = screen.getByText('Compte');
        expect(current).toBeInTheDocument();
        expect(current.closest('[aria-current="page"]')).not.toBeNull();
    });
});
