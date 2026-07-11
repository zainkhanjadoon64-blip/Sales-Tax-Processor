import { useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Search,
  FolderTree,
} from 'lucide-react'
import { useFolderTree } from '../hooks/useDocuments'
import { useFilterStore } from '../stores/useFilterStore'
import type { FolderNode } from '../types/document'

export function FolderExplorer() {
  const { data: treeData, isLoading } = useFolderTree()
  const folderPath = useFilterStore((s) => s.folderPath)
  const setFolderPath = useFilterStore((s) => s.setFolderPath)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const filteredTree = useMemo(() => {
    if (!searchQuery || !treeData) return treeData || []
    const q = searchQuery.toLowerCase()
    const filterNodes = (nodes: FolderNode[]): FolderNode[] => {
      return nodes
        .filter((n) => n.name.toLowerCase().includes(q) || n.children.some((c) => c.name.toLowerCase().includes(q)))
        .map((n) => ({ ...n, children: filterNodes(n.children) }))
    }
    return filterNodes(treeData)
  }, [treeData, searchQuery])

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="h-4 w-4 bg-slate-100 rounded" />
            <div className="h-4 bg-slate-100 rounded flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <FolderTree className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Folders</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          />
        </div>
      </div>

      {/* Clear selection */}
      {folderPath && (
        <button
          onClick={() => setFolderPath(null)}
          className="px-3 py-2 text-xs text-primary-600 hover:text-primary-700 text-left border-b border-slate-100"
        >
          ← Show all documents
        </button>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredTree.map((node) => (
          <FolderTreeItem
            key={node.path}
            node={node}
            level={0}
            selectedPath={folderPath}
            expandedPaths={expandedPaths}
            onToggleExpand={toggleExpand}
            onSelect={(path) => setFolderPath(path === folderPath ? null : path)}
          />
        ))}
      </div>
    </div>
  )
}

interface FolderTreeItemProps {
  node: FolderNode
  level: number
  selectedPath: string | null
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onSelect: (path: string) => void
}

function FolderTreeItem({ node, level, selectedPath, expandedPaths, onToggleExpand, onSelect }: FolderTreeItemProps) {
  if (node.type === 'file') return null

  const isExpanded = expandedPaths.has(node.path) || level < 1
  const isSelected = selectedPath === node.path
  const hasChildren = node.children.some((c) => c.type === 'folder')

  return (
    <div>
      <button
        onClick={() => {
          onToggleExpand(node.path)
          onSelect(node.path)
        }}
        className={`
          w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-xs transition-colors
          ${isSelected ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="h-3 w-3 flex-shrink-0 text-slate-400" /> : <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-400" />
        ) : (
          <span className="w-3" />
        )}
        {isExpanded ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" /> : <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
        <span className="truncate flex-1">{node.name}</span>
        {node.document_count > 0 && (
          <span className="text-[10px] text-slate-400 tabular-nums ml-1">{node.document_count}</span>
        )}
      </button>

      {isExpanded && hasChildren && (
        <div>
          {node.children
            .filter((c) => c.type === 'folder')
            .map((child) => (
              <FolderTreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  )
}