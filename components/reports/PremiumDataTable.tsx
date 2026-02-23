import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

const toCsv = (rows: string[][]) => {
  const esc = (v: string) => {
    const s = (v ?? '').toString();
    if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\n');
};

const download = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export type PremiumDataTableProps<T extends object> = {
  id: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  emptyText?: string;
  initialSorting?: SortingState;
  initialPageSize?: number;
  searchPlaceholder?: string;
  enableColumnToggle?: boolean;
  extraLeft?: React.ReactNode;
  extraRight?: React.ReactNode;
};

export default function PremiumDataTable<T extends object>({
  id,
  data,
  columns,
  isLoading,
  emptyText = 'داده‌ای برای نمایش یافت نشد.',
  initialSorting = [],
  initialPageSize = 15,
  searchPlaceholder = 'جستجو...',
  enableColumnToggle = true,
  extraLeft,
  extraRight,
}: PremiumDataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = localStorage.getItem(`premiumTable:${id}:vis`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      setColumnVisibility(next);
      try {
        localStorage.setItem(`premiumTable:${id}:vis`, JSON.stringify(next));
      } catch {}
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  const visibleLeafColumns = table.getAllLeafColumns().filter((c) => c.getIsVisible());

  const exportCsv = () => {
    const headers = visibleLeafColumns.map((c) => {
      const h: any = c.columnDef.header;
      if (typeof h === 'string') return h;
      return c.id;
    });

    const rows = table.getRowModel().rows.map((r) =>
      visibleLeafColumns.map((c) => {
        const v = r.getValue(c.id);
        if (v === null || v === undefined) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
      })
    );

    const csv = toCsv([headers, ...rows]);
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    download(`${id}-${stamp}.csv`, csv);
  };

  const allColumns = useMemo(() => table.getAllLeafColumns(), [table]);

  return (
    <div className="rounded-2xl border border-primary/10 bg-white/60 dark:bg-black/20 overflow-hidden">
      <div className="p-4 md:p-5 border-b border-primary/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-[340px]">
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-10 pl-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <i className="fa-solid fa-search text-muted" />
              </div>
            </div>
            {extraLeft}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            {extraRight}
            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
              title="خروجی CSV"
            >
              <i className="fa-solid fa-file-csv ml-2" />
              خروجی CSV
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
              title="چاپ"
            >
              <i className="fa-solid fa-print ml-2" />
              چاپ
            </button>

            {enableColumnToggle ? (
              <details className="relative">
                <summary className="list-none cursor-pointer px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm">
                  <i className="fa-solid fa-columns ml-2" />
                  ستون‌ها
                </summary>
                <div className="absolute z-30 mt-2 left-0 w-56 rounded-xl border border-primary/15 bg-white dark:bg-gray-950 shadow-xl p-2">
                  {allColumns.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-text hover:bg-primary/5 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.getIsVisible()}
                        onChange={c.getToggleVisibilityHandler()}
                      />
                      <span className="truncate">
                        {typeof c.columnDef.header === 'string' ? (c.columnDef.header as string) : c.id}
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-3xl text-primary" />
        </div>
      ) : table.getRowModel().rows.length === 0 ? (
        <div className="text-center py-12 text-muted">{emptyText}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/5">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        className={`px-4 py-3 text-right font-semibold uppercase tracking-wider text-text whitespace-nowrap ${
                          h.column.getCanSort() ? 'cursor-pointer hover:bg-primary/10' : ''
                        }`}
                        title={h.column.getCanSort() ? 'برای مرتب‌سازی کلیک کنید' : ''}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: '↑', desc: '↓' }[h.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/60">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-t border-primary/10 text-sm">
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                «
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                ‹
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                ›
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                »
              </button>
            </div>

            <div className="flex items-center gap-2 text-muted">
              <span>صفحه</span>
              <strong className="text-text">
                {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
              </strong>
            </div>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="p-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30"
            >
              <option value="10">نمایش 10</option>
              <option value="15">نمایش 15</option>
              <option value="20">نمایش 20</option>
              <option value="50">نمایش 50</option>
              <option value="100">نمایش 100</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
