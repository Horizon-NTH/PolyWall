import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/table/data-table-view-options';

describe('DataTableColumnHeader', () => {
    it('toggles sorting on click', () => {
        const toggleSortingMock = vi.fn();
        const column = {
            getIsSorted: () => 'asc',
            toggleSorting: toggleSortingMock,
        };

        render(
            <DataTableColumnHeader
                column={column as never}
                title="Organisation"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Organisation'}));

        expect(toggleSortingMock).toHaveBeenCalledWith(true);
    });
});

describe('DataTableViewOptions', () => {
    it('toggles column visibility', async () => {
        const toggleVisibilityMock = vi.fn();
        const table = {
            getAllColumns: () => [
                {
                    id: 'name',
                    accessorFn: () => null,
                    getCanHide: () => true,
                    getIsVisible: () => true,
                    toggleVisibility: toggleVisibilityMock,
                    columnDef: {meta: {label: 'Nom'}},
                },
                {
                    id: 'actions',
                    accessorFn: undefined,
                    getCanHide: () => false,
                    getIsVisible: () => true,
                    toggleVisibility: vi.fn(),
                    columnDef: {},
                },
            ],
        };

        render(<DataTableViewOptions table={table as never} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Colonnes'}));
        fireEvent.click(await screen.findByRole('menuitemcheckbox', {name: 'Nom'}));

        expect(toggleVisibilityMock).toHaveBeenCalledWith(false);
    });
});

describe('DataTableFacetedFilter', () => {
    it('applies a filter value', async () => {
        const setFilterValueMock = vi.fn();
        const column = {
            getFilterValue: () => [],
            setFilterValue: setFilterValueMock,
        };

        render(
            <DataTableFacetedFilter
                column={column as never}
                title="Statut"
                options={[
                    {label: 'Actif', value: 'active'},
                    {label: 'Inactif', value: 'inactive'},
                ]}
            />,
        );

        fireEvent.pointerDown(screen.getByRole('button', {name: /statut/i}));
        fireEvent.click(await screen.findByRole('menuitemcheckbox', {name: 'Actif'}));

        await waitFor(() => {
            expect(setFilterValueMock).toHaveBeenCalledWith(['active']);
        });
    });
});
