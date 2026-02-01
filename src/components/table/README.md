# Data Table Utilities

These utilities wrap TanStack Table with shadcn/ui components to keep table screens consistent.

## Building a table (basic)

```tsx
const table = useDataTable({
  data,
  columns,
  initialPageSize: 10,
  enablePagination: true,
});

return (
  <div className="flex flex-col gap-4">
    <DataTableToolbar
      table={table}
      searchColumnId="name"
      searchPlaceholder="Rechercher..."
    />
    <DataTableView table={table} />
    <DataTablePagination table={table} />
  </div>
);
```

## Row selection (optional)

```tsx
const columns = [
  getRowSelectionColumn<MyRow>(),
  ...baseColumns,
];

const table = useDataTable({
  data,
  columns,
  enableRowSelection: true,
  enablePagination: true,
});

return (
  <>
    <DataTableView table={table} />
    <DataTablePagination table={table} showSelection />
  </>
);
```

## Custom filters & actions

- Add custom filters to `DataTableToolbar` via the `filters` prop.
- Add buttons (create, export…) via the `actions` prop.
- Use `DataTableColumnHeader` for sortable headers.
- Use `DataTableRowActions` to standardize row menus.
- Use `onReset` in `DataTableToolbar` to clear local filter state when the reset button is clicked.
