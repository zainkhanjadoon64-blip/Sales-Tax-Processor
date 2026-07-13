export type WhtEntry = {
  id: string
  name: string
  cnicNtn: string
  date: string
  code: string
  taxable: number
  tax: number
  error?: string
}

export type StatementSession = {
  id: string
  sessionId: string
  fileName: string
  entryCount: number
  taxTotal: number
  taxableTotal: number
  status: string
  statementPeriodStart?: string
  statementPeriodEnd?: string
  lastSavedAt?: string
  createdAt: string
}

export type SystemStatus = {
  status: string
  autoSave: string
  lastBackup: string
  lastSaved: string
  version: string
}

export function formatPkr(value: number): string {
  return value.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
