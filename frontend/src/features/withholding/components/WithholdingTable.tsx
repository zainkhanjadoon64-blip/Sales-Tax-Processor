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
import type { WithholdingRecord } from '../types/withholding';
import { MONTHS } from '../types/withholding';

interface WithholdingTableProps {
  data: WithholdingRecord[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (record: WithholdingRecord) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const periodLabel = (period: string) => {
  const parts = period.split('-');
  if (parts.length !== 2) return period;
  const month = MONTHS.find((m) => m.value === parseInt(parts[1], 10));
  return month ? `${month.label} ${parts[0]}` : period;
};

const formatCurrency = (n: number | null) =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(n) : '—';

export function WithholdingTable({
  data, page, pageSize, total, onPageChange, onEdit, onDelete, loading,
}: WithholdingTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const totalPages = Math.ceil(total / pageSize);

  const columns: ColumnDef<WithholdingRecord>[] = [
    { accessorKey: 'client_name', header: 'Client', cell: (info) => info.getValue() || '—' },
    { accessorKey: 'section_type', header: 'Section' },
    {
      accessorKey: 'period',
      header: 'Period',
      cell: (info) => periodLabel(info.getValue<string>()),
    },
    {
      accessorKey: 'challan_number',
      header: 'Challan #',
      cell: (info) => info.getValue<string>() || '—',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: (info) => formatCurrency(info.getValue<number | null>()),
    },
    {
      accessorKey: 'payment_date',
      header: 'Payment Date',
      cell: (info) => {
        const val = info.getValue<string | null>();
        return val ? new Date(val).toLocaleDateString() : '—';
      },
    },
    {
      accessorKey: 'payment_section',
      header: 'Payment Section',
      cell: (info) => info.getValue<string | null>() || '—',
    },
    {
      accessorKey: 'payment_section_code',
      header: 'Section Code',
      cell: (info) => info.getValue<string | null>() || '—',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex gap-2">
          <button onClick={() => onEdit(info.row.original)} className="text-primary-600 hover:text-primary-900 text-sm font-medium">Edit</button>
          <button onClick={() => onDelete(info.row.original.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true, pageCount: totalPages,
  });

  if (loading) return <div className="card p-8 text-center text-gray-500">Loading withholding records...</div>;
  if (!data?.length) return <div className="card p-8 text-center text-gray-500">No withholding records found.</div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? null}
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Page {page} of {totalPages} ({total} total)</span>
        <div className="flex gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}