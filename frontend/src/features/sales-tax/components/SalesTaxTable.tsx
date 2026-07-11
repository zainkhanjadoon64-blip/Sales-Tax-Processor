import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { SalesTaxRecord } from '../types/salesTax';
import { STATUS_COLORS, MONTHS, type SalesTaxStatus } from '../types/salesTax';

interface SalesTaxTableProps {
  data: SalesTaxRecord[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (record: SalesTaxRecord) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const monthName = (m: number) => MONTHS.find((mo) => mo.value === m)?.label || m;

export function SalesTaxTable({
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
  loading,
}: SalesTaxTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const totalPages = Math.ceil(total / pageSize);

  const columns: ColumnDef<SalesTaxRecord>[] = [
    {
      accessorKey: 'client_name',
      header: 'Client',
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'filing_year',
      header: 'Year',
    },
    {
      accessorKey: 'filing_month',
      header: 'Month',
      cell: (info) => monthName(info.getValue<number>()),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue<SalesTaxStatus>();
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || ''}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'filing_date',
      header: 'Filing Date',
      cell: (info) => {
        const val = info.getValue<string | null>();
        return val ? new Date(val).toLocaleDateString() : '—';
      },
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: (info) => {
        const val = info.getValue<string | null>();
        return val ? (
          <span className="max-w-[200px] truncate block" title={val}>
            {val}
          </span>
        ) : (
          '—'
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(info.row.original)}
            className="text-primary-600 hover:text-primary-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(info.row.original.id)}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  if (loading) {
    return (
      <div className="card p-8 text-center text-gray-500">Loading sales tax records...</div>
    );
  }

  if (!data?.length) {
    return (
      <div className="card p-8 text-center text-gray-500">
        No sales tax records found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">
          Page {page} of {totalPages} ({total} total records)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}