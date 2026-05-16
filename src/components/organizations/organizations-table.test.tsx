import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationsTable } from '@/components/organizations/organizations-table';
import { buildOrganizationRow } from '@/test/fixtures/builders';
import { setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const writeTextMock = vi.fn();

describe('OrganizationsTable', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/organizations');
        writeTextMock.mockReset();
        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
        });
    });

    const data = [buildOrganizationRow()];

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
            expect(toastMock.success).toHaveBeenCalledWith('ID copié.');
        });
    });

    it('shows an error toast when clipboard copy fails', async () => {
        writeTextMock.mockRejectedValueOnce(new Error('fail'));
        render(<OrganizationsTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Ouvrir le menu' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: "Copier l'ID" }));

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith('org-1');
            expect(toastMock.error).toHaveBeenCalledWith("Impossible de copier l'ID.");
        });
    });
});
