import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { UserRole } from '@/generated/prisma/enums';

let pathname = '/dashboard';
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({refresh: refreshMock}),
    usePathname: () => pathname,
}));

vi.mock('next/image', () => ({
    __esModule: true,
    default: (props: ComponentProps<'img'>) => <img {...props} alt="" />,
}));

vi.mock('@/components/sidebar/organization-switcher', () => ({
    OrganizationSwitcher: () => <div data-testid="organization-switcher" />,
}));

const baseProps = {
    organizations: [],
    currentOrganizationId: null,
    user: {
        name: 'Test User',
        email: 'test@polywall.local',
        avatar: '',
    },
};

async function renderSidebar(role: UserRole, organizationId: string | null) {
    const {AppSidebarClient} = await import('@/components/sidebar/app-sidebar-client');
    return render(
        <SidebarProvider>
            <AppSidebarClient
                {...baseProps}
                userRole={role}
                userOrganizationId={organizationId}
            />
        </SidebarProvider>,
    );
}

beforeEach(() => {
    pathname = '/dashboard';
    refreshMock.mockReset();
});

describe('AppSidebarClient', () => {
    it('shows the super admin section only for platform super admins', async () => {
        await renderSidebar(UserRole.PLATFORM_SUPER_ADMIN, null);

        expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('shows the organization admin section only for organization admins', async () => {
        await renderSidebar(UserRole.ORGANIZATION_ADMIN, 'org-1');

        expect(screen.getByText('Organisation')).toBeInTheDocument();
        expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    });

    it('shows no admin sections for content managers', async () => {
        await renderSidebar(UserRole.CONTENT_MANAGER, 'org-1');

        expect(screen.queryByText('Administration')).not.toBeInTheDocument();
        expect(screen.queryByText('Organisation')).not.toBeInTheDocument();
    });
});
