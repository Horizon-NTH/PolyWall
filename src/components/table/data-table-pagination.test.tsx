import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DataTablePagination } from '@/components/table/data-table-pagination';

const setPageIndexMock = vi.fn();
const setPageSizeMock = vi.fn();
const previousPageMock = vi.fn();
const nextPageMock = vi.fn();

const buildTable = (overrides?: {
    pageIndex?: number;
    pageSize?: number;
    pageCount?: number;
    canPrevious?: boolean;
    canNext?: boolean;
    rowCount?: number;
    selectedCount?: number;
}) => ({
    getState: () => ({
        pagination: {
            pageIndex: overrides?.pageIndex ?? 0,
            pageSize: overrides?.pageSize ?? 10,
        },
    }),
    getPageCount: () => overrides?.pageCount ?? 1,
    getFilteredRowModel: () => ({
        rows: Array.from({length: overrides?.rowCount ?? 3}),
    }),
    getFilteredSelectedRowModel: () => ({
        rows: Array.from({length: overrides?.selectedCount ?? 1}),
    }),
    getCanPreviousPage: () => overrides?.canPrevious ?? false,
    getCanNextPage: () => overrides?.canNext ?? false,
    setPageIndex: setPageIndexMock,
    setPageSize: setPageSizeMock,
    previousPage: previousPageMock,
    nextPage: nextPageMock,
});

describe('DataTablePagination', () => {
    beforeEach(() => {
        setPageIndexMock.mockReset();
        setPageSizeMock.mockReset();
        previousPageMock.mockReset();
        nextPageMock.mockReset();
    });

    it('renders pagination summary', () => {
        const table = buildTable({pageIndex: 1, pageCount: 5, rowCount: 12});
        render(<DataTablePagination table={table as never} />);

        expect(screen.getByText('12 ligne(s)')).toBeInTheDocument();
        expect(screen.getByText('Page 2 sur 5')).toBeInTheDocument();
    });

    it('shows selection count when enabled', () => {
        const table = buildTable({rowCount: 4, selectedCount: 2});
        render(<DataTablePagination table={table as never} showSelection />);

        expect(screen.getByText('2 sur 4 sélectionné(s)')).toBeInTheDocument();
    });

    it('disables navigation when there are no pages', () => {
        const table = buildTable({canPrevious: false, canNext: false});
        render(<DataTablePagination table={table as never} />);

        expect(screen.getByRole('button', {name: 'Page précédente'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Page suivante'})).toBeDisabled();
    });

    it('triggers pagination controls', () => {
        const table = buildTable({canPrevious: true, canNext: true, pageCount: 3});
        render(<DataTablePagination table={table as never} />);

        fireEvent.click(screen.getByRole('button', {name: 'Page précédente'}));
        fireEvent.click(screen.getByRole('button', {name: 'Page suivante'}));
        fireEvent.click(screen.getByRole('button', {name: 'Première page'}));
        fireEvent.click(screen.getByRole('button', {name: 'Dernière page'}));

        expect(previousPageMock).toHaveBeenCalled();
        expect(nextPageMock).toHaveBeenCalled();
        expect(setPageIndexMock).toHaveBeenCalledWith(0);
        expect(setPageIndexMock).toHaveBeenCalledWith(2);
    });
});
