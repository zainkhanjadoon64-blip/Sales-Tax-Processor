import React, { useCallback } from 'react'
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react'
import { useFilterStore } from '../stores/useFilterStore'
import { useDocumentStore } from '../stores/useDocumentStore'
import { ViewToggle } from './ViewToggle'
import type { SortField, DocumentType } from '../types/document'
import {
  DOCUMENT_CATEGORY_OPTIONS,
  FILING_STATUS_OPTIONS,
} from '../types/document'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'upload_date', label: 'Upload Date' },
  { value: 'file_name', label: 'File Name' },
  { value: 'file_size', label: 'File Size' },
  { value: 'doc_category', label: 'Category' },
  { value: 'filing_status', label: 'Status' },
]

interface DocumentToolbarProps {
  onUpload: () => void
}

export function DocumentToolbar({ onUpload }: DocumentToolbarProps) {
  const {
    searchQuery, setSearchQuery,
    docCategories, toggleDocCategory,
    taxYear, setTaxYear,
    filingStatus, setFilingStatus,
    fileType, setFileType,
    isMissing, setIsMissing,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    activeFilterCount, isFilterPanelOpen, setFilterPanelOpen,
    resetFilters,
  } = useFilterStore()

  const [searchInput, setSearchInput] = React.useState(searchQuery)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, setSearchQuery])

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }, [sortOrder, setSortOrder])

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents... (Ctrl+K)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchInput('')
            }}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchQuery('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterPanelOpen(!isFilterPanelOpen)}
          className={`
            inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors
            ${isFilterPanelOpen || activeFilterCount > 0
              ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }
          `}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary-600 text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort button */}
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="py-2.5 pl-3 pr-8 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={toggleSortOrder}
            className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* View toggle */}
        <ViewToggle />

        {/* Upload button */}
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Upload
        </button>
      </div>

      {/* Filter chips (active filters) */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {docCategories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat}
              onRemove={() => toggleDocCategory(cat)}
            />
          ))}
          {taxYear !== null && (
            <FilterChip
              label={`Year: ${taxYear}`}
              onRemove={() => setTaxYear(null)}
            />
          )}
          {filingStatus && (
            <FilterChip
              label={filingStatus}
              onRemove={() => setFilingStatus(null)}
            />
          )}
          {fileType && (
            <FilterChip
              label={fileType}
              onRemove={() => setFileType(null)}
            />
          )}
          {isMissing && (
            <FilterChip
              label="Missing only"
              onRemove={() => setIsMissing(false)}
            />
          )}
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-slate-500 hover:text-red-600 underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expanded filter panel */}
      {isFilterPanelOpen && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-5 animate-in slide-in-from-top-2">
          <FilterPanel />
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
      {label}
      <button onClick={onRemove} className="hover:text-primary-900 ml-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function FilterPanel() {
  const {
    docCategories, toggleDocCategory,
    taxYear, setTaxYear,
    filingStatus, setFilingStatus,
    fileType, setFileType,
    isMissing, setIsMissing,
  } = useFilterStore()

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {/* Document Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Category
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={docCategories.includes(opt.value)}
                onChange={() => toggleDocCategory(opt.value)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Year */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Tax Year
        </label>
        <select
          value={taxYear ?? ''}
          onChange={(e) => setTaxYear(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All years</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Filing Status */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Filing Status
        </label>
        <div className="space-y-1.5">
          {FILING_STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="radio"
                name="filing_status"
                checked={filingStatus === opt.value}
                onChange={() => setFilingStatus(filingStatus === opt.value ? null : opt.value)}
                className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* File Type + Missing */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            File Type
          </label>
          <div className="flex gap-2">
            {['PDF', 'Excel'].map((type) => (
              <button
                key={type}
                onClick={() => setFileType(fileType === type ? null : type as DocumentType)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  fileType === type
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMissing}
              onChange={(e) => setIsMissing(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-slate-700">Show missing only</span>
          </label>
        </div>
      </div>
    </div>
  )
}