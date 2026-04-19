import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { NavSection, NavSingle } from '@/components/sidebar/nav-sections';

let pathname = '/dashboard';

vi.mock('next/navigation', () => ({
    usePathname: () => pathname,
}));

const items = [
    {title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard},
    {title: 'Placeholder', url: '#', icon: LayoutDashboard},
];

function renderWithSidebar(ui: ReactElement) {
    return render(<SidebarProvider>{ui}</SidebarProvider>);
}

beforeEach(() => {
    pathname = '/dashboard';
});

describe('Nav sections', () => {
    it('marks exact matches as active', () => {
        renderWithSidebar(<NavSingle items={items} />);

        expect(
            screen.getByRole('link', {name: 'Dashboard'}),
        ).toHaveAttribute('data-active', 'true');
    });

    it('does not mark dashboard root as active on nested paths', () => {
        pathname = '/dashboard/settings';
        renderWithSidebar(<NavSection label="Main" items={items} />);

        expect(
            screen.getByRole('link', {name: 'Dashboard'}),
        ).toHaveAttribute('data-active', 'false');
    });

    it('never marks hash links as active', () => {
        renderWithSidebar(<NavSingle items={items} />);

        expect(
            screen.getByRole('link', {name: 'Placeholder'}),
        ).toHaveAttribute('data-active', 'false');
    });
});
