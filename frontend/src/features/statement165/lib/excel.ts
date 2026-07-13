import * as XLSX from 'xlsx'
import type { WhtEntry } from '../types'

const HEADER_ALIASES: Record<keyof Omit<WhtEntry, 'id'>, string[]> = {
  name: ['name', 'taxpayer', 'taxpayer name', 'party', 'party name', 'vendor'],
  cnicNtn: ['cnic/ntn', 'cnic', 'ntn', 'cnic_ntn', 'cnic ntn', 'registration no'],
  date: ['date', 'payment date', 'transaction date'],
  code: ['code', 'section code', 'tax code', 'nature code'],
  taxable: ['taxable', 'taxable (pkr)', 'taxable amount', 'amount', 'gross amount'],
  tax: ['tax', 'tax (pkr)', 'tax amount', 'wht', 'tax deducted'],
  error: ['error', 'error message', 'error description'],
}

function matchHeader(header: string): keyof Omit<WhtEntry, 'id'> | null {
  const normalized = header.toLowerCase().trim()
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) {
      return field as keyof Omit<WhtEntry, 'id'>
    }
  }
  return null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('en-GB')
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const dd = String(parsed.d).padStart(2, '0')
      const mm = String(parsed.m).padStart(2, '0')
      return `${dd}/${mm}/${parsed.y}`
    }
  }
  return String(value ?? '').trim()
}

export async function parseExcelFile(
  file: File,
): Promise<{ entries: WhtEntry[]; error?: string }> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { entries: [], error: 'The file contains no worksheets.' }
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  if (rows.length === 0) {
    return { entries: [], error: 'No data rows found in the worksheet.' }
  }

  const headerMap = new Map<string, keyof Omit<WhtEntry, 'id'>>()
  for (const header of Object.keys(rows[0])) {
    const field = matchHeader(header)
    if (field) headerMap.set(header, field)
  }

  const mappedFields = new Set(headerMap.values())
  if (!mappedFields.has('name') || !mappedFields.has('taxable')) {
    return {
      entries: [],
      error:
        'Could not recognize the columns. Expected headers like: Name, CNIC/NTN, Date, Code, Taxable, Tax.',
    }
  }

  const entries: WhtEntry[] = []
  for (const row of rows) {
    const entry: WhtEntry = {
      id: crypto.randomUUID(),
      name: '',
      cnicNtn: '',
      date: '',
      code: '',
      taxable: 0,
      tax: 0,
    }
    for (const [header, field] of headerMap) {
      const value = row[header]
      if (field === 'taxable' || field === 'tax') {
        entry[field] = toNumber(value)
      } else if (field === 'date') {
        entry.date = toDateString(value)
      } else {
        entry[field] = String(value ?? '').trim()
      }
    }
    if (entry.name || entry.taxable > 0) {
      entries.push(entry)
    }
  }

  if (entries.length === 0) {
    return { entries: [], error: 'No valid entries could be parsed from the file.' }
  }

  return { entries }
}

export function generateStatementWorkbook(entries: WhtEntry[]): Blob {
  const rows = entries.map((entry, index) => ({
    '#': index + 1,
    Name: entry.name,
    'CNIC/NTN': entry.cnicNtn,
    Date: entry.date,
    Code: entry.code,
    'Taxable (PKR)': entry.taxable,
    'Tax (PKR)': entry.tax,
  }))

  const totals = {
    '#': '',
    Name: 'TOTAL',
    'CNIC/NTN': '',
    Date: '',
    Code: '',
    'Taxable (PKR)': entries.reduce((sum, e) => sum + e.taxable, 0),
    'Tax (PKR)': entries.reduce((sum, e) => sum + e.tax, 0),
  }

  const sheet = XLSX.utils.json_to_sheet([...rows, totals])
  sheet['!cols'] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'WHT Statement 165')

  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
