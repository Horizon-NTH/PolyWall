import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DataTableToolbar } from '@/components/table/data-table-toolbar';

const resetFiltersMock = vi.fn();
const resetSortingMock = vi.fn();
const setFilterValueMock = vi.fn();

const buildTable = (overrides?: {
    columnFilters?: { id: string; value: string }[];
    sorting?: { id: string; desc: boolean }[];
}) => ({
    getState: () => ({
        columnFilters: overrides?.columnFilters ?? [],
        sorting: overrides?.sorting ?? [],
    }),
    getAllColumns: () => [],
    resetColumnFilters: resetFiltersMock,
    resetSorting: resetSortingMock,
    getColumn: () => ({
        getFilterValue: () => '',
        setFilterValue: setFilterValueMock,
    }),
});

describe('DataTableToolbar', () => {
    beforeEach(() => {
        resetFiltersMock.mockReset();
        resetSortingMock.mockReset();
        setFilterValueMock.mockReset();
    });

    it('shows reset button when filters are active', () => {
        const table = buildTable({columnFilters: [{id: 'name', value: 'Org'}]});
        render(<DataTableToolbar table={table as never} searchColumnId="name" />);

        expect(screen.getByRole('button', {name: 'Réinitialiser'})).toBeInTheDocument();
    });

    it('calls reset handlers', () => {
        const table = buildTable({sorting: [{id: 'name', desc: false}]});
        render(<DataTableToolbar table={table as never} searchColumnId="name" />);

        fireEvent.click(screen.getByRole('button', {name: 'Réinitialiser'}));

        expect(resetFiltersMock).toHaveBeenCalled();
        expect(resetSortingMock).toHaveBeenCalled();
    });

    it('updates the search filter value', () => {
        const table = buildTable();
        render(<DataTableToolbar table={table as never} searchColumnId="name" />);

        fireEvent.change(screen.getByPlaceholderText('Rechercher...'), {
            target: {value: 'Org'},
        });

        expect(setFilterValueMock).toHaveBeenCalledWith('Org');
    });
});
