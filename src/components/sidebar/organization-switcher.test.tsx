import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AbilityContext } from '@/lib/casl/ability-context';
import { OrganizationSwitcher } from '@/components/sidebar/organization-switcher';
import type { AppAbility } from '@/lib/casl/ability';
import { defineAbilityFor } from '@/lib/casl/ability';
import { UserRole } from '@/generated/prisma/enums';

const refreshMock = vi.fn();
const switchOrganizationMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({refresh: refreshMock}),
}));

vi.mock('@/actions/organization-actions', () => ({
    switchOrganization: (...args: unknown[]) => switchOrganizationMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

vi.mock('next/image', () => ({
    __esModule: true,
    default: (props: ComponentProps<'img'>) => <img {...props} alt="" />,
}));

const organizations = [
    {id: 'org-1', name: 'Org One'},
    {id: 'org-2', name: 'Org Two'},
];

function renderSwitcher({
                            role,
                            organizationId,
                            organizationsOverride = organizations,
                            currentOrganizationId = organizations[0].id,
                        }: {
    role: UserRole;
    organizationId: string | null;
    organizationsOverride?: typeof organizations;
    currentOrganizationId?: string | null;
}) {
    const ability = defineAbilityFor({role, organizationId}) as AppAbility;

    return render(
        <SidebarProvider>
            <AbilityContext.Provider value={ability}>
                <OrganizationSwitcher
                    organizations={organizationsOverride}
                    currentOrganizationId={currentOrganizationId}
                />
            </AbilityContext.Provider>
        </SidebarProvider>,
    );
}

beforeEach(() => {
    refreshMock.mockReset();
    switchOrganizationMock.mockReset();
    toastErrorMock.mockReset();
});

describe('OrganizationSwitcher', () => {
    it('renders a dropdown only when switching is allowed and multiple orgs exist', async () => {
        renderSwitcher({role: UserRole.PLATFORM_SUPER_ADMIN, organizationId: null});

        const trigger = screen.getByRole('button', {name: /polywall/i});
        fireEvent.pointerDown(trigger);

        expect(await screen.findByText('Organisations')).toBeInTheDocument();
    });

    it('renders a static link when only one org exists', () => {
        renderSwitcher({
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
            organizationsOverride: [organizations[0]],
        });

        expect(screen.getByRole('link', {name: /polywall/i})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /polywall/i})).not.toBeInTheDocument();
    });

    it.each([
        ['content managers', UserRole.CONTENT_MANAGER],
        ['organization admins', UserRole.ORGANIZATION_ADMIN],
    ])('renders a static link for %s', (_label, role) => {
        renderSwitcher({role, organizationId: 'org-1'});

        expect(screen.getByRole('link', {name: /polywall/i})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /polywall/i})).not.toBeInTheDocument();
    });

    it('refreshes the router after a successful organization switch', async () => {
        switchOrganizationMock.mockResolvedValueOnce({ok: true});
        renderSwitcher({role: UserRole.PLATFORM_SUPER_ADMIN, organizationId: null});

        fireEvent.pointerDown(screen.getByRole('button', {name: /polywall/i}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Org Two'}));

        await waitFor(() => {
            expect(switchOrganizationMock).toHaveBeenCalledWith('org-2');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('shows an error toast when switching fails', async () => {
        switchOrganizationMock.mockResolvedValueOnce({ok: false});
        renderSwitcher({role: UserRole.PLATFORM_SUPER_ADMIN, organizationId: null});

        fireEvent.pointerDown(screen.getByRole('button', {name: /polywall/i}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Org Two'}));

        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith(
                'Impossible de changer d\'organisation.',
            );
        });
    });
});
