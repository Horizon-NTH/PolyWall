import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationsTable } from '@/components/organizations/organizations-table';

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const writeTextMock = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/organizations',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('OrganizationsTable', () => {
    beforeEach(() => {
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
        writeTextMock.mockReset();
        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
        });
    });

    const data = [
        {
            id: 'org-1',
            name: 'Org One',
            description: 'Description One',
            createdAt: '2024-01-01T10:00:00.000Z',
            usersCount: 2,
            screensCount: 1,
            channelsCount: 3,
        },
    ];

    it('renders organization data', () => {
        render(<OrganizationsTable data={data} />);

        expect(screen.getByText('Org One')).toBeInTheDocument();
        expect(screen.getByText('Description One')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Org One' })).toHaveAttribute(
            'href',
            '/dashboard/organizations/org-1?returnTo=%2Fdashboard%2Forganizations',
        );
    });

    it('copies the organization id and shows success toast', async () => {
        writeTextMock.mockResolvedValueOnce(undefined);
        render(<OrganizationsTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Ouvrir le menu' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: "Copier l'ID" }));

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith('org-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('ID copié.');
        });
    });

    it('shows an error toast when clipboard copy fails', async () => {
        writeTextMock.mockRejectedValueOnce(new Error('fail'));
        render(<OrganizationsTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Ouvrir le menu' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: "Copier l'ID" }));

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith('org-1');
            expect(toastErrorMock).toHaveBeenCalledWith("Impossible de copier l'ID.");
        });
    });
});
