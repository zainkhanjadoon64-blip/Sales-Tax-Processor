import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useClient, useClientActivity, useUpdateClient, useCreateClient, useDeleteClient,
  extractDuplicateError,
} from '../hooks/useClients';
import { useSalesTaxByClient, useCreateSalesTaxRecord, useUpdateSalesTaxRecord, useDeleteSalesTaxRecord } from '../../sales-tax/hooks/useSalesTax';
import { useWithholdingByClient, useCreateWithholdingRecord, useUpdateWithholdingRecord, useDeleteWithholdingRecord } from '../../withholding/hooks/useWithholding';
import { ClientForm } from '../components/ClientForm';
import { ActivityLog } from '../components/ActivityLog';
import { useDocuments, useUploadDocument } from '../../documents/hooks/useDocuments';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../tasks/hooks/useTasks';
import { useReports, useGenerateReport, useDeleteReport } from '../../reports/hooks/useReports';
import { UploadDialog } from '../../documents/components/UploadDialog';
import { SalesTaxForm } from '../../sales-tax/components/SalesTaxForm';
import { WithholdingForm } from '../../withholding/components/WithholdingForm';
import { TaskForm } from '../../tasks/components/TaskForm';
import {
  ArrowLeft, Edit, FileText, DollarSign,
  RefreshCw, Upload, Plus, Download, Trash2, X, CheckCircle, XCircle, Clock,
  AlertTriangle, UserCheck, MapPin, FolderOpen, ChevronRight, Image,
  FileSpreadsheet, File, Eye, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Task, TaskCreate } from '../../tasks/types/task';
import type { SalesTaxRecord, SalesTaxStatus } from '../../sales-tax/types/salesTax';
import type { WithholdingRecord } from '../../withholding/types/withholding';
import type { Document } from '../../documents/types/document';
import type { Report } from '../../reports/types/report';

type TabId = 'overview' | 'sales-tax' | 'withholding' | 'documents' | 'tasks' | 'reports';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales-tax', label: 'Sales Tax' },
  { id: 'withholding', label: 'Withholding' },
  { id: 'documents', label: 'Documents' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'reports', label: 'Reports' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SALES_TAX_STATUS_STYLES: Record<SalesTaxStatus, string> = {
  Filed: 'bg-green-100 text-green-800 border-green-200',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  'Not Filed': 'bg-red-100 text-red-800 border-red-200',
  Overdue: 'bg-red-200 text-red-900 border-red-300',
};

function parsePeriod(period: string | null | undefined): { year: string; month: number } | null {
  if (!period) return null;
  const parts = period.split('-');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[1], 10);
  if (isNaN(month) || month < 1 || month > 12) return null;
  return { year: parts[0], month };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <File className="h-5 w-5 text-red-500" />;
  if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return <Image className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-slate-400" />;
}

function taskPriorityLabel(p: Task['priority']): string {
  const labels: Record<Task['priority'], string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
  return labels[p] || p;
}

function taskPriorityColor(p: Task['priority']): string {
  const colors: Record<Task['priority'], string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };
  return colors[p] || 'bg-gray-100 text-gray-800';
}

function taskStatusLabel(s: Task['status']): string {
  const labels: Record<Task['status'], string> = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
  return labels[s] || s;
}

function taskStatusColor(s: Task['status']): string {
  const colors: Record<Task['status'], string> = {
    PENDING: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return colors[s] || 'bg-gray-100 text-gray-800';
}

function tabFromHash(hash: string): TabId {
  const id = hash.replace('#', '') as TabId;
  return TABS.some((t) => t.id === id) ? id : 'overview';
}

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(() => tabFromHash(location.hash));
  const [salesTaxYear, setSalesTaxYear] = useState(new Date().getFullYear());
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'ALL' | 'PDF' | 'EXCEL'>('ALL');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [salesTaxPreset, setSalesTaxPreset] = useState<{ year: number; month: number } | null>(null);
  const [showSalesTaxForm, setShowSalesTaxForm] = useState(false);
  const [editingSalesTax, setEditingSalesTax] = useState<SalesTaxRecord | null>(null);
  const [showWithholdingForm, setShowWithholdingForm] = useState(false);
  const [editingWithholding, setEditingWithholding] = useState<WithholdingRecord | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const setTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `${location.pathname}#${tab}`);
  }, [location.pathname]);

  useEffect(() => {
    setActiveTab(tabFromHash(location.hash));
  }, [location.hash]);

  useEffect(() => {
    if (!previewDocument) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    (async () => {
      try {
        const { documentService } = await import('../../documents/services/documentService');
        const arrayBuffer = await documentService.getFileAsArrayBuffer(previewDocument.id);
        const blob = new Blob([arrayBuffer]);
        if (cancelled) return;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch {
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewDocument]);

  // Queries
  const { data: client, isLoading, error, refetch } = useClient(clientId!);
  const { data: activityData, isLoading: activityLoading } = useClientActivity(clientId!);
  const { data: salesTaxData, refetch: refetchSalesTax } = useSalesTaxByClient(clientId!);
  const { data: withholdingData, refetch: refetchWithholding } = useWithholdingByClient(clientId!);
  const { documents: documentsData, refetch: refetchDocs } = useDocuments();
  const { data: tasksData, refetch: refetchTasks } = useTasks({ client_id: clientId, limit: 100 });
  const { data: reportsData, refetch: refetchReports } = useReports();

  // Mutations
  const updateClientMutation = useUpdateClient();
  const createClientMutation = useCreateClient();
  const createSalesTaxMutation = useCreateSalesTaxRecord();
  const updateSalesTaxMutation = useUpdateSalesTaxRecord();
  const deleteSalesTaxMutation = useDeleteSalesTaxRecord();
  const createWithholdingMutation = useCreateWithholdingRecord();
  const updateWithholdingMutation = useUpdateWithholdingRecord();
  const deleteWithholdingMutation = useDeleteWithholdingRecord();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const generateReportMutation = useGenerateReport();
  const deleteReportMutation = useDeleteReport();
  const uploadDocumentMutation = useUploadDocument();
  const deleteClientMutation = useDeleteClient();

  // Derived data
  const salesTaxRecords: SalesTaxRecord[] = salesTaxData?.data || [];
  const withholdingRecords: WithholdingRecord[] = withholdingData?.data || [];
  const activities = activityData || [];
  const documents: Document[] = documentsData || [];
  const tasks: Task[] = tasksData?.data || [];
  const reports: Report[] = (reportsData?.data || []).filter(
    (r) => r.parameters?.client_id === clientId
  );

  const complianceSummary = {
    filed: salesTaxRecords.filter((r) => r.status === 'Filed').length,
    pending: salesTaxRecords.filter((r) => r.status === 'Pending').length,
    overdue: salesTaxRecords.filter((r) => r.status === 'Overdue').length,
    notFiled: salesTaxRecords.filter((r) => r.status === 'Not Filed').length,
  };

  const portfolioSummary = {
    salesTaxRecords: salesTaxRecords.length,
    withholdingTotal: withholdingRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
    documents: documents.length,
    openTasks: tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
  };

  const filteredDocuments = documentTypeFilter === 'ALL'
    ? documents
    : documents.filter((d) => d.file_type === documentTypeFilter);

  const salesTaxByMonth = MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    const record = salesTaxRecords.find((r) => r.filing_year === salesTaxYear && r.filing_month === month);
    return { month, name, record };
  });

  const classificationBadges: { label: string; color: string }[] = [];
  if (client?.sales_tax_registered) classificationBadges.push({ label: 'Sales Tax Registered', color: 'bg-green-100 text-green-800' });
  if (client?.withholding_registered) classificationBadges.push({ label: 'Withholding Registered', color: 'bg-blue-100 text-blue-800' });
  if (client?.client_type) classificationBadges.push({ label: client.client_type, color: 'bg-purple-100 text-purple-800' });
  if (client?.business_type) classificationBadges.push({ label: client.business_type, color: 'bg-amber-100 text-amber-800' });

  // Handlers
    const handleSubmit = useCallback(async (data: any) => {
    setFormErrors({});
    try {
      if (clientId) {
        await updateClientMutation.mutateAsync({ id: clientId, data });
        setPageMessage({ type: 'success', text: 'Client updated successfully.' });
      } else {
        await createClientMutation.mutateAsync(data);
        setPageMessage({ type: 'success', text: 'Client created successfully.' });
      }
      setIsEditing(false);
    } catch (err: unknown) {
      const dup = extractDuplicateError(err);
      if (dup) {
        setFormErrors({ [dup.field]: dup.message });
      } else {
        setPageMessage({ type: 'error', text: 'Failed to save client. Please try again.' });
      }
    }
  }, [clientId, updateClientMutation, createClientMutation]);
  // Sales Tax CRUD
  const handleSalesTaxSubmit = useCallback(async (data: any) => {
    try {
      if (editingSalesTax?.id) {
        await updateSalesTaxMutation.mutateAsync({ id: editingSalesTax.id, data });
      } else {
        await createSalesTaxMutation.mutateAsync({ ...data, client_id: clientId! });
      }
      setShowSalesTaxForm(false);
      setEditingSalesTax(null);
      setSalesTaxPreset(null);
      refetchSalesTax();
    } catch {
      // Keep form open on error
    }
  }, [clientId, editingSalesTax, createSalesTaxMutation, updateSalesTaxMutation, refetchSalesTax]);

  const handleSalesTaxEdit = useCallback((record: SalesTaxRecord) => {
    setEditingSalesTax(record);
    setShowSalesTaxForm(true);
  }, []);

  const handleDeleteSalesTax = useCallback(async (recordId: string) => {
    setDeleteLoading(true);
    try {
      await deleteSalesTaxMutation.mutateAsync(recordId);
      refetchSalesTax();
      setConfirmDelete(null);
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to delete sales tax record.' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteSalesTaxMutation, refetchSalesTax]);

  // Withholding CRUD
  const handleWithholdingSubmit = useCallback(async (data: any) => {
    try {
      if (editingWithholding) {
        await updateWithholdingMutation.mutateAsync({ id: editingWithholding.id, data });
      } else {
        await createWithholdingMutation.mutateAsync({ ...data, client_id: clientId! });
      }
      setShowWithholdingForm(false);
      setEditingWithholding(null);
      refetchWithholding();
    } catch {
      // Keep form open on error
    }
  }, [clientId, editingWithholding, createWithholdingMutation, updateWithholdingMutation, refetchWithholding]);

  const handleWithholdingEdit = useCallback((record: WithholdingRecord) => {
    setEditingWithholding(record);
    setShowWithholdingForm(true);
  }, []);

  const handleDeleteWithholding = useCallback(async (recordId: string) => {
    setDeleteLoading(true);
    try {
      await deleteWithholdingMutation.mutateAsync(recordId);
      refetchWithholding();
      setConfirmDelete(null);
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to delete withholding record.' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteWithholdingMutation, refetchWithholding]);

  // Task handlers
  const handleTaskEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  }, []);

  const handleTaskSubmit = useCallback(async (data: TaskCreate) => {
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
      } else {
        await createTaskMutation.mutateAsync({ ...data, client_id: clientId! });
      }
      setShowTaskForm(false);
      setEditingTask(null);
      refetchTasks();
    } catch {
      // Keep form open on error
    }
  }, [clientId, editingTask, createTaskMutation, updateTaskMutation, refetchTasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setDeleteLoading(true);
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      refetchTasks();
      setConfirmDelete(null);
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to delete task.' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTaskMutation, refetchTasks]);

  // Document handlers
  const handleUploadDocument = useCallback(async (formData: FormData) => {
    const file = formData.get('file') as File;
    const cid = formData.get('client_id') as string;
    const docCategory = formData.get('document_type') as string | undefined;
    await uploadDocumentMutation.mutateAsync({
      file,
      clientId: cid,
      options: docCategory ? { doc_category: docCategory } : undefined,
    });
    refetchDocs();
    setShowUploadDialog(false);
  }, [uploadDocumentMutation, refetchDocs]);

  const handleDownloadDoc = useCallback(async (doc: Document) => {
    try {
      const { documentService } = await import('../../documents/services/documentService');
      const arrayBuffer = await documentService.getFileAsArrayBuffer(doc.id);
      const blob = new Blob([arrayBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, []);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    setDeleteLoading(true);
    try {
      const { documentService } = await import('../../documents/services/documentService');
      await documentService.deleteDocument(docId);
      refetchDocs();
      setConfirmDelete(null);
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to delete document.' });
    } finally {
      setDeleteLoading(false);
    }
  }, [refetchDocs]);

  // Report handlers
  const handleGenerateReport = useCallback(async (reportType: string) => {
    try {
      await generateReportMutation.mutateAsync({
        title: `${reportType.replace(/_/g, ' ')} - ${client?.client_name || ''}`,
        report_type: reportType as any,
        parameters: { client_id: clientId },
      });
      refetchReports();
    } catch (err) {
      console.error('Report generation failed:', err);
    }
  }, [clientId, client, generateReportMutation, refetchReports]);

  const handleDownloadReport = useCallback(async (reportId: string) => {
    try {
      const blob = await (await import('../../reports/services/reportService')).reportService.download(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
    }
  }, []);

  const handleDeleteReport = useCallback(async (reportId: string) => {
    setDeleteLoading(true);
    try {
      await deleteReportMutation.mutateAsync(reportId);
      refetchReports();
      setConfirmDelete(null);
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to delete report.' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteReportMutation, refetchReports]);

  const handleDeleteClient = useCallback(async () => {
    if (!clientId) return;
    setDeleteLoading(true);
    try {
      await deleteClientMutation.mutateAsync({ id: clientId });
      navigate('/clients');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPageMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Failed to delete client.' });
      setConfirmDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [clientId, deleteClientMutation, navigate]);

  const handleRefreshAll = useCallback(() => {
    refetch();
    refetchSalesTax();
    refetchWithholding();
    refetchDocs();
    refetchTasks();
    refetchReports();
  }, [refetch, refetchSalesTax, refetchWithholding, refetchDocs, refetchTasks, refetchReports]);

  const handleTaskStatusChange = useCallback(async (task: Task, status: Task['status']) => {
    try {
      await updateTaskMutation.mutateAsync({ id: task.id, data: { status } });
      refetchTasks();
      setPageMessage({ type: 'success', text: 'Task status updated.' });
    } catch {
      setPageMessage({ type: 'error', text: 'Failed to update task status.' });
    }
  }, [updateTaskMutation, refetchTasks]);

  const handleSalesTaxMonthClick = useCallback((record: SalesTaxRecord | undefined, month: number) => {
    if (record) {
      setSalesTaxPreset(null);
      handleSalesTaxEdit(record);
      return;
    }
    setEditingSalesTax(null);
    setSalesTaxPreset({ year: salesTaxYear, month });
    setShowSalesTaxForm(true);
  }, [salesTaxYear, handleSalesTaxEdit]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-24">
        <p className="text-danger-500 text-lg">Failed to load client details.</p>
        <button onClick={() => navigate('/clients')} className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </button>
      </div>
    );
  }

  const statusColor = (client.is_active ?? true)
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';

  // ============ TAB RENDERERS ============

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Client Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client ID</p>
              <p className="text-sm text-slate-900 font-mono">{client.id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client Name</p>
              <p className="text-sm text-slate-900 font-medium">{client.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Name</p>
              <p className="text-sm text-slate-900">{client.business_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">City</p>
              <p className="text-sm text-slate-900 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {client.city || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-slate-900">{client.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Number</p>
              <p className="text-sm text-slate-900">{client.contact_number || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Address</p>
              <p className="text-sm text-slate-900">{client.address || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Person</p>
              <p className="text-sm text-slate-900 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                {client.contact_person || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {client.is_active ?? true ? 'Active' : 'Inactive'}
              </span>
            </div>
            {classificationBadges.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Classification</p>
                <div className="flex flex-wrap gap-2">
                  {classificationBadges.map((badge) => (
                    <span key={badge.label} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Registration Status</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${client.sales_tax_registered ? 'bg-green-100' : 'bg-gray-100'}`}>
                <FileText className={`h-5 w-5 ${client.sales_tax_registered ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Sales Tax</p>
                <p className={`text-xs ${client.sales_tax_registered ? 'text-green-600' : 'text-gray-500'}`}>
                  {client.sales_tax_registered ? 'Registered' : 'Not Registered'}
                </p>
                {client.strn && <p className="text-xs text-slate-500 font-mono mt-0.5">{client.strn}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${client.withholding_registered ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <DollarSign className={`h-5 w-5 ${client.withholding_registered ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Withholding Tax</p>
                <p className={`text-xs ${client.withholding_registered ? 'text-blue-600' : 'text-gray-500'}`}>
                  {client.withholding_registered ? 'Registered' : 'Not Registered'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Tax Identifiers</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">NTN</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{client.ntn || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CNIC</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{client.cnic || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">STRN</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{client.strn || '-'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Additional Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Province</p>
              <p className="text-sm text-slate-900">{client.province || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Type</p>
              <p className="text-sm text-slate-900">{client.business_type || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client Type</p>
              <p className="text-sm text-slate-900">{client.client_type || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Registration Date</p>
              <p className="text-sm text-slate-900">
                {client.registration_date ? format(new Date(client.registration_date), 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tax Period</p>
              <p className="text-sm text-slate-900">{client.tax_period || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">FBR Office</p>
              <p className="text-sm text-slate-900">{client.fbr_office || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Person Designation</p>
              <p className="text-sm text-slate-900">{client.contact_person_designation || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Person Phone</p>
              <p className="text-sm text-slate-900">{client.contact_person_phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Person Email</p>
              <p className="text-sm text-slate-900">{client.contact_person_email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Secondary Phone</p>
              <p className="text-sm text-slate-900">{client.secondary_phone || '-'}</p>
            </div>
          </div>
        </div>

        {documents.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
              <button onClick={() => setTab('documents')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(doc.file_name)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-500">{doc.file_type} • {format(new Date(doc.upload_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <button onClick={() => setPreviewDocument(doc)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded shrink-0" title="Preview">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {client.notes && (
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{portfolioSummary.salesTaxRecords}</p>
            <p className="text-xs text-slate-500 mt-1">Sales Tax Records</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">Rs. {portfolioSummary.withholdingTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Withholding Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{portfolioSummary.documents}</p>
            <p className="text-xs text-slate-500 mt-1">Documents</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{portfolioSummary.openTasks}</p>
            <p className="text-xs text-slate-500 mt-1">Open Tasks</p>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Compliance Summary</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm text-slate-700">Filed</span></div>
              <span className="text-lg font-bold text-green-700">{complianceSummary.filed}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-600" /><span className="text-sm text-slate-700">Pending</span></div>
              <span className="text-lg font-bold text-yellow-700">{complianceSummary.pending}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /><span className="text-sm text-slate-700">Overdue</span></div>
              <span className="text-lg font-bold text-red-700">{complianceSummary.overdue}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-gray-500" /><span className="text-sm text-slate-700">Not Filed</span></div>
              <span className="text-lg font-bold text-gray-700">{complianceSummary.notFiled}</span>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Tasks</h2>
              <button onClick={() => setTab('tasks')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${taskPriorityColor(task.priority)}`}>
                        {taskPriorityLabel(task.priority)}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${taskStatusColor(task.status)}`}>
                        {taskStatusLabel(task.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Activity Log</h2>
          </div>
          <div className="p-4">
            {activityLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : (
              <ActivityLog activities={activities} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSalesTaxTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{complianceSummary.filed}</p><p className="text-xs text-slate-500 mt-1">Filed</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{complianceSummary.pending}</p><p className="text-xs text-slate-500 mt-1">Pending</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-red-600">{complianceSummary.overdue}</p><p className="text-xs text-slate-500 mt-1">Overdue</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-600">{complianceSummary.notFiled}</p><p className="text-xs text-slate-500 mt-1">Not Filed</p></div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Monthly Filing Calendar</h2>
            <p className="text-sm text-slate-500 mt-0.5">Click a month to view or add a record</p>
          </div>
          <select
            value={salesTaxYear}
            onChange={(e) => setSalesTaxYear(Number(e.target.value))}
            className="input w-auto"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {salesTaxByMonth.map(({ month, name, record }) => (
            <button
              key={month}
              type="button"
              onClick={() => handleSalesTaxMonthClick(record, month)}
              className={`p-3 rounded-lg border text-left transition-colors hover:shadow-sm ${
                record
                  ? SALES_TAX_STATUS_STYLES[record.status] || 'bg-slate-50 border-slate-200'
                  : 'bg-slate-50 border-slate-200 hover:border-primary-300'
              }`}
            >
              <p className="text-xs font-medium text-slate-500">{name.slice(0, 3)}</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{record?.status || 'No Record'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sales Tax Filing Records</h2>
          <button onClick={() => { setEditingSalesTax(null); setSalesTaxPreset(null); setShowSalesTaxForm(true); }} className="btn-primary text-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Record
          </button>
        </div>
        <div className="p-6">
          {salesTaxRecords.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No sales tax records found for this client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Year</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Month</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Remarks</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesTaxRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{record.filing_year || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{record.filing_month ? MONTH_NAMES[record.filing_month - 1] : '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{record.filing_date ? format(new Date(record.filing_date), 'MMM d, yyyy') : '-'}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{record.remarks || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${SALES_TAX_STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-800'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleSalesTaxEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Edit"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => setConfirmDelete({ type: 'sales-tax', id: record.id, label: `Sales Tax ${record.filing_year}/${record.filing_month}` })} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showSalesTaxForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingSalesTax ? 'Edit Sales Tax Record' : 'Add Sales Tax Record'}</h3>
              <button onClick={() => { setShowSalesTaxForm(false); setEditingSalesTax(null); setSalesTaxPreset(null); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <SalesTaxForm
                onSubmit={handleSalesTaxSubmit}
                onCancel={() => { setShowSalesTaxForm(false); setEditingSalesTax(null); setSalesTaxPreset(null); }}
                clients={[{ id: clientId!, client_name: client.client_name }]}
                editRecord={editingSalesTax}
                presetYear={salesTaxPreset?.year}
                presetMonth={salesTaxPreset?.month}
                loading={createSalesTaxMutation.isPending || updateSalesTaxMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderWithholdingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Records</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{withholdingRecords.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg"><DollarSign className="h-6 w-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">Rs. {withholdingRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg"><FileText className="h-6 w-6 text-purple-600" /></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Withholding Records</h2>
          <button onClick={() => { setEditingWithholding(null); setShowWithholdingForm(true); }} className="btn-primary text-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Record
          </button>
        </div>
        <div className="p-6">
          {withholdingRecords.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No withholding records found for this client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Period</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Section</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Challan #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Payment Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">File</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Remarks</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withholdingRecords.map((record) => {
                    const parsed = parsePeriod(record.period);
                    return (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">
                          {parsed ? `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}` : record.period || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {record.section_type || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{record.challan_number || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {record.amount ? `Rs. ${Number(record.amount).toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.payment_date ? format(new Date(record.payment_date), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.document ? (
                            <button
                              onClick={async () => {
                                try {
                                  const { documentService } = await import('../../documents/services/documentService');
                                  const arrayBuffer = await documentService.getFileAsArrayBuffer(record.document!.id);
                                  const blob = new Blob([arrayBuffer]);
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = record.document!.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                } catch {}
                              }}
                              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                              title={record.document.original_file_name || record.document.file_name}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[120px]">{record.document.original_file_name || record.document.file_name}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{record.remarks || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleWithholdingEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Edit"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => setConfirmDelete({ type: 'withholding', id: record.id, label: `${parsed ? MONTH_NAMES[parsed.month - 1] + ' ' + parsed.year : record.period || 'record'}` })} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showWithholdingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingWithholding ? 'Edit Withholding Record' : 'Add Withholding Record'}</h3>
              <button onClick={() => { setShowWithholdingForm(false); setEditingWithholding(null); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <WithholdingForm
                onSubmit={handleWithholdingSubmit}
                onCancel={() => { setShowWithholdingForm(false); setEditingWithholding(null); }}
                clients={[{ id: clientId!, client_name: client.client_name }]}
                editRecord={editingWithholding}
                loading={createWithholdingMutation.isPending || updateWithholdingMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <p className="text-sm text-slate-500 mt-1">Supported formats: PDF, XLSX, XLS (max 10MB)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value as 'ALL' | 'PDF' | 'EXCEL')}
            className="input w-auto"
          >
            <option value="ALL">All Types</option>
            <option value="PDF">PDF Only</option>
            <option value="EXCEL">Excel Only</option>
          </select>
          <button onClick={() => setShowUploadDialog(true)} className="btn-primary">
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </button>
        </div>
      </div>

      <div className="card">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-slate-100 rounded-full inline-flex mb-4"><FolderOpen className="h-8 w-8 text-slate-400" /></div>
            <p className="text-slate-500 font-medium">No documents uploaded yet</p>
            <p className="text-sm text-slate-400 mt-1">Click "Upload Document" to add files</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">File Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Size</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Uploaded By</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(doc.file_name)}
                        <span className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.file_type === 'PDF' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{doc.file_size ? formatFileSize(doc.file_size) : '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{doc.uploaded_by || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{doc.upload_date ? format(new Date(doc.upload_date), 'MMM d, yyyy') : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreviewDocument(doc)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded" title="Preview"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Download"><Download className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDelete({ type: 'document', id: doc.id, label: doc.file_name })} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadDialog && (
        <UploadDialog
          onUpload={handleUploadDocument}
          onClose={() => setShowUploadDialog(false)}
          isLoading={uploadDocumentMutation.isPending}
          defaultClientId={clientId!}
          hideClientIdField
        />
      )}

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(previewDocument.file_name)}
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">{previewDocument.file_name}</h3>
                  <p className="text-xs text-slate-500">{previewDocument.file_type} • {previewDocument.file_size ? formatFileSize(previewDocument.file_size) : 'Unknown size'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadDoc(previewDocument)} className="btn-secondary text-sm px-3 py-1.5"><Download className="h-4 w-4 mr-1" /> Download</button>
                <button onClick={() => setPreviewDocument(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-50 min-h-[400px]">
              {previewLoading ? (
                <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
              ) : previewDocument.file_type === 'PDF' && previewUrl ? (
                <embed src={previewUrl} type="application/pdf" className="w-full h-[70vh] rounded-lg border border-slate-200" />
              ) : previewUrl && /\.(png|jpe?g|gif)$/i.test(previewDocument.file_name) ? (
                <img src={previewUrl} alt={previewDocument.file_name} className="max-w-full max-h-[70vh] rounded-lg shadow" />
              ) : (
                <div className="text-center">
                  {previewDocument.file_type === 'PDF'
                    ? <File className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    : <FileSpreadsheet className="h-16 w-16 text-green-400 mx-auto mb-4" />}
                  <p className="text-slate-600">Inline preview not available for this file type</p>
                  <p className="text-sm text-slate-400 mt-1">
                    <button onClick={() => handleDownloadDoc(previewDocument)} className="text-primary-600 hover:underline">Download</button> to open locally.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTasksTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
        <button onClick={() => { setEditingTask(null); setShowTaskForm(true); }} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-700">{tasks.filter((t) => t.status === 'PENDING').length}</p><p className="text-xs text-slate-500 mt-1">Pending</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-700">{tasks.filter((t) => t.status === 'IN_PROGRESS').length}</p><p className="text-xs text-slate-500 mt-1">In Progress</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-700">{tasks.filter((t) => t.status === 'COMPLETED').length}</p><p className="text-xs text-slate-500 mt-1">Completed</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-red-700">{tasks.filter((t) => t.status === 'CANCELLED').length}</p><p className="text-xs text-slate-500 mt-1">Cancelled</p></div>
      </div>

      <div className="card">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">No tasks found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Assigned To</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      {task.description && <p className="text-xs text-slate-500 truncate max-w-[250px]">{task.description}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${taskPriorityColor(task.priority)}`}>
                        {taskPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${taskStatusColor(task.status)}`}>
                        {taskStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{task.assigned_to || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleTaskStatusChange(task, task.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')}
                            className="p-1.5 text-slate-400 hover:text-green-600 rounded text-xs"
                            title={task.status === 'PENDING' ? 'Start' : 'Complete'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleTaskEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Edit"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDelete({ type: 'task', id: task.id, label: task.title })} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <button onClick={() => { setShowTaskForm(false); setEditingTask(null); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <TaskForm
                onSubmit={handleTaskSubmit}
                onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
                initialData={editingTask || undefined}
                isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => handleGenerateReport('SALES_TAX_SUMMARY')} disabled={generateReportMutation.isPending} className="card p-4 text-left hover:shadow-md transition-shadow group">
          <div className="p-3 bg-primary-100 rounded-lg inline-block mb-3 group-hover:bg-primary-200 transition-colors">
            {generateReportMutation.isPending ? <Loader2 className="h-6 w-6 text-primary-600 animate-spin" /> : <FileText className="h-6 w-6 text-primary-600" />}
          </div>
          <p className="text-sm font-semibold text-slate-900">Sales Tax Summary</p>
          <p className="text-xs text-slate-500 mt-1">Monthly compliance report</p>
        </button>
        <button onClick={() => handleGenerateReport('WITHHOLDING_SUMMARY')} disabled={generateReportMutation.isPending} className="card p-4 text-left hover:shadow-md transition-shadow group">
          <div className="p-3 bg-green-100 rounded-lg inline-block mb-3 group-hover:bg-green-200 transition-colors">
            {generateReportMutation.isPending ? <Loader2 className="h-6 w-6 text-green-600 animate-spin" /> : <FileText className="h-6 w-6 text-green-600" />}
          </div>
          <p className="text-sm font-semibold text-slate-900">Withholding Summary</p>
          <p className="text-xs text-slate-500 mt-1">236H & 153 summary</p>
        </button>
        <button onClick={() => handleGenerateReport('CLIENT_LIST')} disabled={generateReportMutation.isPending} className="card p-4 text-left hover:shadow-md transition-shadow group">
          <div className="p-3 bg-blue-100 rounded-lg inline-block mb-3 group-hover:bg-blue-200 transition-colors">
            {generateReportMutation.isPending ? <Loader2 className="h-6 w-6 text-blue-600 animate-spin" /> : <FileText className="h-6 w-6 text-blue-600" />}
          </div>
          <p className="text-sm font-semibold text-slate-900">Client List</p>
          <p className="text-xs text-slate-500 mt-1">Client overview report</p>
        </button>
        <button onClick={() => handleGenerateReport('TAX_CALENDAR')} disabled={generateReportMutation.isPending} className="card p-4 text-left hover:shadow-md transition-shadow group">
          <div className="p-3 bg-amber-100 rounded-lg inline-block mb-3 group-hover:bg-amber-200 transition-colors">
            {generateReportMutation.isPending ? <Loader2 className="h-6 w-6 text-amber-600 animate-spin" /> : <FileText className="h-6 w-6 text-amber-600" />}
          </div>
          <p className="text-sm font-semibold text-slate-900">Tax Calendar</p>
          <p className="text-xs text-slate-500 mt-1">Due dates overview</p>
        </button>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Generated Reports</h2>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">No reports generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Generated</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900 font-medium">{report.title}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{report.report_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{report.created_at ? format(new Date(report.created_at), 'MMM d, yyyy HH:mm') : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleDownloadReport(report.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Download"><Download className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDelete({ type: 'report', id: report.id, label: report.title })} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clients')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.client_name}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
              {client.city && <><MapPin className="h-3.5 w-3.5" />{client.city}</>}
              {client.business_name && <><span className="text-slate-300">|</span>{client.business_name}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleRefreshAll} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Client
          </button>
          <button
            onClick={() => setConfirmDelete({ type: 'client', id: client.id, label: client.client_name })}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      {pageMessage && (
        <div className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${
          pageMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <p className={`text-sm ${pageMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {pageMessage.text}
          </p>
          <button onClick={() => setPageMessage(null)} className="text-slate-500 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const tabCounts: Partial<Record<TabId, number>> = {
              documents: documents.length,
              tasks: tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
              'sales-tax': salesTaxRecords.length,
              withholding: withholdingRecords.length,
              reports: reports.length,
            };
            const count = tabCounts[tab.id];
            return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                  {count}
                </span>
              )}
            </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'sales-tax' && renderSalesTaxTab()}
      {activeTab === 'withholding' && renderWithholdingTab()}
      {activeTab === 'documents' && renderDocumentsTab()}
      {activeTab === 'tasks' && renderTasksTab()}
      {activeTab === 'reports' && renderReportsTab()}

      {/* Edit Client Modal */}
      {isEditing && (
        <ClientForm
          client={client}
          onSubmit={handleSubmit}
          onClose={() => { setIsEditing(false); setFormErrors({}); }}
          isLoading={updateClientMutation.isPending}
          formErrors={formErrors}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setConfirmDelete(null)} aria-hidden="true" />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete {
                      confirmDelete.type === 'client' ? 'Client'
                      : confirmDelete.type === 'sales-tax' ? 'Sales Tax Record'
                      : confirmDelete.type === 'withholding' ? 'Withholding Record'
                      : confirmDelete.type === 'document' ? 'Document'
                      : confirmDelete.type === 'task' ? 'Task'
                      : confirmDelete.type === 'report' ? 'Report'
                      : 'Record'
                    }
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Are you sure you want to delete <strong>{confirmDelete.label}</strong>? This action cannot be undone.
                    {confirmDelete.type === 'client' && ' Clients with linked records cannot be deleted.'}
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setConfirmDelete(null)} className="btn-secondary" disabled={deleteLoading}>Cancel</button>
                    <button
                      onClick={() => {
                        switch (confirmDelete.type) {
                          case 'client': handleDeleteClient(); break;
                          case 'sales-tax': handleDeleteSalesTax(confirmDelete.id); break;
                          case 'withholding': handleDeleteWithholding(confirmDelete.id); break;
                          case 'document': handleDeleteDocument(confirmDelete.id); break;
                          case 'task': handleDeleteTask(confirmDelete.id); break;
                          case 'report': handleDeleteReport(confirmDelete.id); break;
                        }
                      }}
                      className="btn-danger"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete'}
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