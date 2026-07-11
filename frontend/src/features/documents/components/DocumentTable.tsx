import { FileText, Download, Trash2, ExternalLink } from 'lucide-react';
import type { Document } from '../types/document';

interface DocumentTableProps {
  documents: Document[];
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onView: (doc: Document) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function DocumentTable({ documents, onDownload, onDelete, onView }: DocumentTableProps) {
  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg">No documents found</p>
        <p className="text-sm mt-1">Upload a document to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">File Name</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Size</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Upload Date</th>
            <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-900 truncate max-w-[300px]">
                    {doc.original_file_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  doc.file_type === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {doc.file_type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatFileSize(doc.file_size)}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatDate(doc.upload_date)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(doc)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="View details"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDownload(doc)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}