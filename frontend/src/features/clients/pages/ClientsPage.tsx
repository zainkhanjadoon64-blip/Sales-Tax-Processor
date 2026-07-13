import { useState, useCallback, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  useClients,

  useCreateClient,

  useUpdateClient,

  useDeleteClient,

  useExportClients,

} from '../hooks/useClients';

import { ClientTable } from '../components/ClientTable';

import { ClientForm } from '../components/ClientForm';

import { Plus, RefreshCw, AlertTriangle, CheckCircle, X, Download, Filter, ChevronDown, Users, Building2, FileCheck } from 'lucide-react';

import type { Client, ClientFilters } from '../types/client';



function getApiErrorMessage(err: unknown): string {

  const error = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };

  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  if (detail && typeof detail === 'object' && 'message' in detail) {

    return String((detail as { message: string }).message);

  }

  if (error?.response?.status === 401) {
    return 'Session expired. Please log in again.';
  }
  if (error?.response?.status === 500) {
    return 'Server error while saving client. Restart the backend server and try again.';
  }
  if (error?.message) return error.message;
  return 'Failed to save client. Please try again.';

}



function downloadBlob(blob: Blob, filename: string) {

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;

  a.download = filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);

}



export function ClientsPage() {

  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState<string>('created_at');

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Pick<ClientFilters, 'sales_tax_registered' | 'withholding_registered' | 'kpra_registered' | 'is_active' | 'date_from' | 'date_to'>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  const [pageError, setPageError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();



  useEffect(() => {

    clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {

      setDebouncedSearch(searchInput);

      setPage(1);

    }, 300);

    return () => clearTimeout(searchTimeout.current);

  }, [searchInput]);



  const queryFilters: ClientFilters = {

    search: debouncedSearch || undefined,

    page,

    limit: 25,

    sort_by: sortBy,

    sort_order: sortOrder,

    ...filters,

  };



  const { data, isLoading, isRefetching, error, refetch } = useClients(queryFilters);

  const createMutation = useCreateClient(handleDuplicateError);

  const updateMutation = useUpdateClient(handleDuplicateError);

  const deleteMutation = useDeleteClient();

  const exportMutation = useExportClients();



  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const clients = data?.data || [];

  const totalClients = data?.total || 0;

  const totalPages = Math.ceil(totalClients / 25);



  function handleDuplicateError(field: string, message: string) {

    setFormErrors({ [field]: message });

  }



  const handleCreate = useCallback(async (formData: any) => {

    setFormErrors({});

    setPageError('');

    try {

      await createMutation.mutateAsync(formData);

      setIsFormOpen(false);

      setEditingClient(null);

      setPage(1);

      setSuccessMessage('Client created successfully.');

    } catch (err) {

      if ((err as any)?.response?.status !== 409) {

        setPageError(getApiErrorMessage(err));

      }

      throw err;

    }

  }, [createMutation]);



  const handleUpdate = useCallback(async (formData: any) => {

    setFormErrors({});

    setPageError('');

    try {

      await updateMutation.mutateAsync({ id: editingClient!.id, data: formData });

      setIsFormOpen(false);

      setEditingClient(null);

      setSuccessMessage('Client updated successfully.');

    } catch (err) {

      if ((err as any)?.response?.status !== 409) {

        setPageError(getApiErrorMessage(err));

      }

      throw err;

    }

  }, [updateMutation, editingClient]);



  const handleDeleteConfirm = async () => {

    if (!deleteConfirm) return;

    try {

      await deleteMutation.mutateAsync(deleteConfirm.id);

      setSuccessMessage(`Client "${deleteConfirm.client_name}" deleted successfully.`);

      setPageError('');

    } catch (err: unknown) {

      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

      setPageError(typeof detail === 'string' ? detail : 'Failed to delete client.');

    }

    setDeleteConfirm(null);

  };



  const handleExport = async () => {

    try {

      const blob = await exportMutation.mutateAsync(queryFilters);

      downloadBlob(blob, `clients-export-${new Date().toISOString().slice(0, 10)}.csv`);

      setSuccessMessage('Clients exported successfully.');

    } catch {

      setPageError('Failed to export clients.');

    }

  };



  const handleSort = (column: string) => {

    if (sortBy === column) {

      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));

    } else {

      setSortBy(column);

      setSortOrder('asc');

    }

    setPage(1);

  };



  const handleView = (client: Client) => {

    navigate(`/clients/${client.id}`);

  };



  const handleEdit = (client: Client) => {

    setEditingClient(client);

    setFormErrors({});

    setPageError('');

    setSuccessMessage('');

    setIsFormOpen(true);

  };



  const handleDeleteRequest = (client: Client) => {

    setDeleteConfirm(client);

  };



  const handleAddNew = () => {

    setEditingClient(null);

    setFormErrors({});

    setPageError('');

    setSuccessMessage('');

    setIsFormOpen(true);

  };



  const handleCloseForm = () => {

    setIsFormOpen(false);

    setEditingClient(null);

    setFormErrors({});

  };



  const clearFilters = () => {

    setFilters({});

    setPage(1);

  };



  const pageStats = {

    salesTax: clients.filter((c) => c.sales_tax_registered).length,

    withholding: clients.filter((c) => c.withholding_registered).length,

    thisMonth: clients.filter(

      (c) => new Date(c.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    ).length,

  };



  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');



  return (
    <div className="space-y-6 px-6">
      {/* Page hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white p-6 sm:p-8 mt-6">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-400/40 via-transparent to-transparent" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 mb-3">
              <Users className="h-3.5 w-3.5" />
              Client Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl">
              Manage your client portfolio, tax registrations, and compliance records in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => refetch()} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleExport} disabled={exportMutation.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors">
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? 'Exporting...' : 'Export'}
            </button>
            <button onClick={handleAddNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 hover:bg-primary-50 text-sm font-semibold shadow-sm transition-colors">
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          </div>
        </div>
      </div>



      {successMessage && (

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start justify-between gap-3">

          <div className="flex items-start gap-2">

            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-green-800">{successMessage}</p>

          </div>

          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800" aria-label="Dismiss">

            <X className="h-4 w-4" />

          </button>

        </div>

      )}



      {pageError && !isFormOpen && (

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-3">

          <div className="flex items-start gap-2">

            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-red-800">{pageError}</p>

          </div>

          <button onClick={() => setPageError('')} className="text-red-600 hover:text-red-800" aria-label="Dismiss">

            <X className="h-4 w-4" />

          </button>

        </div>

      )}



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Clients</p>
            <Users className="h-5 w-5 text-primary-500 opacity-60" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalClients}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Sales Tax (page)</p>
            <FileCheck className="h-5 w-5 text-green-500 opacity-60" />
          </div>
          <p className="text-3xl font-bold text-green-700 mt-2">{pageStats.salesTax}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Withholding (page)</p>
            <Building2 className="h-5 w-5 text-blue-500 opacity-60" />
          </div>
          <p className="text-3xl font-bold text-blue-700 mt-2">{pageStats.withholding}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">New This Month (page)</p>
            <Plus className="h-5 w-5 text-amber-500 opacity-60" />
          </div>
          <p className="text-3xl font-bold text-amber-700 mt-2">{pageStats.thisMonth}</p>
        </div>
      </div>



      <div className="card">

        <div className="p-4 border-b border-slate-200 space-y-3">

          <div className="flex flex-col sm:flex-row gap-3">

            <div className="relative flex-1 max-w-md">

              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

              </svg>

              <input

                type="text"

                placeholder="Search by name, NTN, CNIC, STRN, email, city..."

                value={searchInput}

                onChange={(e) => setSearchInput(e.target.value)}

                className="input pl-10 w-full"

              />

            </div>

            <button

              onClick={() => setShowFilters((v) => !v)}

              className={`btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}

            >

              <Filter className="h-4 w-4 mr-2" />

              Filters

              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />

            </button>

          </div>



          {showFilters && (

            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="checkbox"

                  checked={filters.sales_tax_registered === true}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, sales_tax_registered: e.target.checked ? true : undefined }));

                    setPage(1);

                  }}

                  className="h-4 w-4 rounded border-slate-300 text-primary-600"

                />

                <span className="text-sm text-slate-700">Sales Tax Registered</span>

              </label>

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="checkbox"

                  checked={filters.withholding_registered === true}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, withholding_registered: e.target.checked ? true : undefined }));

                    setPage(1);

                  }}

                  className="h-4 w-4 rounded border-slate-300 text-primary-600"

                />

                <span className="text-sm text-slate-700">Withholding Registered</span>

              </label>

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="checkbox"

                  checked={filters.kpra_registered === true}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, kpra_registered: e.target.checked ? true : undefined }));

                    setPage(1);

                  }}

                  className="h-4 w-4 rounded border-slate-300 text-primary-600"

                />

                <span className="text-sm text-slate-700">KPRA Registered</span>

              </label>

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="checkbox"

                  checked={filters.is_active === true}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, is_active: e.target.checked ? true : undefined }));

                    setPage(1);

                  }}

                  className="h-4 w-4 rounded border-slate-300 text-primary-600"

                />

                <span className="text-sm text-slate-700">Active Only</span>

              </label>

              <div className="flex items-end">

                <button type="button" onClick={clearFilters} className="text-sm text-primary-600 hover:underline">

                  Clear filters

                </button>

              </div>

              <div>

                <label className="label block mb-1 text-xs">Created From</label>

                <input

                  type="date"

                  value={filters.date_from || ''}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, date_from: e.target.value || undefined }));

                    setPage(1);

                  }}

                  className="input w-full"

                />

              </div>

              <div>

                <label className="label block mb-1 text-xs">Created To</label>

                <input

                  type="date"

                  value={filters.date_to || ''}

                  onChange={(e) => {

                    setFilters((f) => ({ ...f, date_to: e.target.value || undefined }));

                    setPage(1);

                  }}

                  className="input w-full"

                />

              </div>

            </div>

          )}

        </div>



        <div className="p-4">

          {isLoading ? (

            <div className="flex justify-center py-12">

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />

            </div>

          ) : error ? (

            <div className="text-center py-12 text-danger-500">

              <p className="font-medium text-red-800">{getApiErrorMessage(error)}</p>
              <p className="text-sm text-red-600 mt-1">If this persists, restart the backend server so database migrations can run.</p>

              <button onClick={() => refetch()} className="mt-2 text-primary-600 hover:underline">

                Retry

              </button>

            </div>

          ) : (

            <>

              <ClientTable

                clients={clients}

                onEdit={handleEdit}

                onDelete={handleDeleteRequest}

                onView={handleView}

                sortBy={sortBy}

                sortOrder={sortOrder}

                onSort={handleSort}

              />

              {totalPages > 1 && (

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">

                  <p className="text-sm text-slate-500">

                    Page {page} of {totalPages} ({totalClients} total clients)

                  </p>

                  <div className="flex items-center gap-2">

                    <button

                      onClick={() => setPage((p) => Math.max(1, p - 1))}

                      disabled={page <= 1}

                      className="btn-secondary text-sm py-1 px-3"

                    >

                      Previous

                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {

                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));

                      const pageNum = start + i;

                      if (pageNum > totalPages) return null;

                      return (

                        <button

                          key={pageNum}

                          onClick={() => setPage(pageNum)}

                          className={`px-3 py-1 text-sm rounded-lg ${

                            pageNum === page

                              ? 'bg-primary-600 text-white'

                              : 'text-slate-600 hover:bg-slate-100'

                          }`}

                        >

                          {pageNum}

                        </button>

                      );

                    })}

                    <button

                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}

                      disabled={page >= totalPages}

                      className="btn-secondary text-sm py-1 px-3"

                    >

                      Next

                    </button>

                  </div>

                </div>

              )}

            </>

          )}

        </div>

      </div>



      {isFormOpen && (

        <ClientForm

          client={editingClient}

          onSubmit={editingClient ? handleUpdate : handleCreate}

          onClose={handleCloseForm}

          isLoading={isSubmitting}

          formErrors={formErrors}

        />

      )}



      {deleteConfirm && (

        <div className="fixed inset-0 z-50 overflow-y-auto">

          <div className="flex min-h-full items-center justify-center p-4">

            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setDeleteConfirm(null)} aria-hidden="true" />

            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">

              <div className="flex items-start gap-4">

                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">

                  <AlertTriangle className="h-6 w-6 text-red-600" />

                </div>

                <div className="flex-1">

                  <h3 className="text-lg font-semibold text-slate-900">Delete Client</h3>

                  <p className="mt-2 text-sm text-slate-500">

                    Are you sure you want to delete <strong>{deleteConfirm.client_name}</strong>?

                    This action cannot be undone. Clients with associated sales tax,

                    withholding, or document records cannot be deleted.

                  </p>

                  <div className="mt-6 flex justify-end gap-3">

                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary" disabled={deleteMutation.isPending}>

                      Cancel

                    </button>

                    <button onClick={handleDeleteConfirm} className="btn-danger" disabled={deleteMutation.isPending}>

                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Client'}

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

