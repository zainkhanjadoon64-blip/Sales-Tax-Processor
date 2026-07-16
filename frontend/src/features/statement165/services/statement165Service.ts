import { apiClient } from '../../../services/apiClient'
import type { WhtEntry, StatementSession, SystemStatus } from '../types'

export async function importChallanPdf(
  file: File,
  sectionHint?: string,
): Promise<{ success: boolean; entries: WhtEntry[] }> {
  const formData = new FormData()
  formData.append('file', file)
  if (sectionHint) formData.append('section_hint', sectionHint)
  return apiClient.upload('/withholding/statement-165/import-challan-pdf', formData)
}

export async function createEntry(entry: WhtEntry): Promise<{ success: boolean; entry: WhtEntry }> {
  return apiClient.post('/withholding/statement-165/entries', entry)
}

export async function listEntries(params?: {
  limit?: number
  offset?: number
  session_id?: string
}): Promise<{ success: boolean; total: number; entries: WhtEntry[] }> {
  return apiClient.get('/withholding/statement-165/entries', { params })
}

export async function updateEntry(
  entryId: string,
  data: Partial<WhtEntry>,
): Promise<{ success: boolean }> {
  return apiClient.put(`/withholding/statement-165/entries/${entryId}`, data)
}

export async function deleteEntry(entryId: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/withholding/statement-165/entries/${entryId}`)
}

export async function saveStatementEntries(
  entries: WhtEntry[],
  fileName?: string,
  statementPeriodStart?: string,
  statementPeriodEnd?: string,
): Promise<{ success: boolean; session_id: string; records_processed: number }> {
  return apiClient.post('/withholding/statement-165/save-entries', {
    entries,
    fileName,
    statementPeriodStart,
    statementPeriodEnd,
  })
}

export async function getStatementHistory(): Promise<{
  success: boolean
  sessions: StatementSession[]
}> {
  return apiClient.get('/withholding/statement-165/history')
}

export async function createSession(): Promise<{ success: boolean; session: StatementSession }> {
  return apiClient.post('/withholding/statement-165/sessions')
}

export async function listSessions(): Promise<{
  success: boolean
  sessions: StatementSession[]
}> {
  return apiClient.get('/withholding/statement-165/sessions')
}

export async function updateSession(
  sessionId: string,
  data: {
    status?: string
    file_name?: string
    statement_period_start?: string
    statement_period_end?: string
  },
): Promise<{ success: boolean }> {
  return apiClient.put(`/withholding/statement-165/sessions/${sessionId}`, data)
}

export async function uploadStatementFile(
  file: File,
): Promise<{ success: boolean; entries: WhtEntry[]; source: string; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.upload('/withholding/statement-165/upload', formData)
}

export async function processStatement(
  entries: WhtEntry[],
  fileName?: string,
  statementPeriodStart?: string,
  statementPeriodEnd?: string,
): Promise<Blob> {
  return apiClient.post('/withholding/statement-165/process', {
    entries,
    fileName,
    statementPeriodStart,
    statementPeriodEnd,
  }, { responseType: 'blob' })
}

export async function getSystemStatus(): Promise<{
  success: boolean
  status: SystemStatus
}> {
  return apiClient.get('/withholding/statement-165/status')
}

export async function ping(): Promise<{ success: boolean }> {
  return apiClient.get('/withholding/statement-165/ping')
}

export async function uploadAbbottabadExcel(
  file: File,
): Promise<{ success: boolean; entries: WhtEntry[]; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.upload('/withholding/statement-165/upload-excel', formData)
}

export async function uploadExistingStatement(
  file: File,
): Promise<{ success: boolean; entries: WhtEntry[]; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.upload('/withholding/statement-165/upload-existing', formData)
}

export async function appendToExistingStatement(
  file: File,
  entries: WhtEntry[],
): Promise<Blob> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('body', JSON.stringify({ entries }))
  return apiClient.upload('/withholding/statement-165/append-to-existing', formData, { responseType: 'blob' })
}

export function getDownloadUrl(sessionId: string): string {
  return `/api/v1/withholding/statement-165/download/${sessionId}`
}
