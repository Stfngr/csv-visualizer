import { computed, ref } from 'vue'
import Papa from 'papaparse'
import type { DataPoint, DataSeries, ParsedDataset } from '@/types/data'

type CsvRow = string[]

function isNumeric(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '' && Number.isFinite(Number(value.trim()))
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(file)
  })
}

function parseRows(text: string): CsvRow[] {
  const parsed = Papa.parse<string[]>(text, {
    delimiter: '',
    skipEmptyLines: 'greedy',
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }

  const rows = parsed.data.map((row) => row.map((cell) => cell.trim()))
  if (rows.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.')
  }

  return rows
}

function removeEmptyColumns(rows: CsvRow[]): CsvRow[] {
  const maxColumns = Math.max(...rows.map((row) => row.length))
  const keptColumns = Array.from({ length: maxColumns }, (_, index) => index)
    .filter((index) => rows.some((row) => row[index]?.trim() !== ''))

  return rows.map((row) => keptColumns.map((index) => row[index] ?? ''))
}

function hasHeaderRow(rows: CsvRow[]): boolean {
  const firstRow = rows[0]
  const sample = rows.slice(1, Math.min(rows.length, 21))
  return firstRow.some((cell, column) => {
    if (isNumeric(cell)) return false
    return sample.some((row) => isNumeric(row[column])) || cell.trim() !== ''
  })
}

function createLongFormSeries(headers: string[], rows: CsvRow[]): DataSeries[] | null {
  const normalized = headers.map((header) => header.toLowerCase().trim())
  const secondsIndex = normalized.findIndex((header) => ['seconds', 'second', 'time', 'timestamp'].includes(header))
  const pidIndex = normalized.indexOf('pid')
  const valueIndex = normalized.indexOf('value')
  const unitIndex = normalized.findIndex((header) => ['unit', 'units'].includes(header))

  if (secondsIndex === -1 || pidIndex === -1 || valueIndex === -1) return null

  const timestamps: number[] = []
  const timestampSet = new Set<number>()
  const grouped = new Map<string, { label: string; unit: string | null; values: Map<number, number | null> }>()

  for (const row of rows) {
    const seconds = row[secondsIndex]?.trim()
    const label = row[pidIndex]?.trim()
    if (!isNumeric(seconds) || !label) continue
    const time = Number(seconds)

    if (!timestampSet.has(time)) {
      timestampSet.add(time)
      timestamps.push(time)
    }

    const value = row[valueIndex]?.trim()
    const unit = unitIndex === -1 ? '' : row[unitIndex]?.trim()
    const series = grouped.get(label) ?? { label, unit: unit || null, values: new Map<number, number | null>() }
    series.unit ||= unit || null
    series.values.set(time, isNumeric(value) ? Number(value) : null)
    grouped.set(label, series)
  }

  return [...grouped.values()].map((series) => ({
    id: series.label,
    label: series.label,
    unit: series.unit,
    points: timestamps.map((x) => ({ x, y: series.values.get(x) ?? null })),
  }))
}

function createGenericSeries(headers: string[], rows: CsvRow[]): DataSeries[] {
  const numericColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => rows.some((row) => isNumeric(row[index])))

  if (numericColumns.length === 0) {
    throw new Error('No numeric columns found to chart.')
  }

  const firstNumeric = numericColumns[0]
  const useFirstColumnAsXAxis = firstNumeric.index === 0 && numericColumns.length > 1
  const valueColumns = useFirstColumnAsXAxis ? numericColumns.slice(1) : numericColumns

  return valueColumns.map(({ header, index }) => ({
    id: `${index}:${header}`,
    label: header,
    unit: null,
    points: rows.map((row, rowIndex) => ({
      x: useFirstColumnAsXAxis && isNumeric(row[firstNumeric.index]) ? Number(row[firstNumeric.index]) : rowIndex + 1,
      y: isNumeric(row[index]) ? Number(row[index]) : null,
    })),
  }))
}

function createDataset(fileName: string, text: string): ParsedDataset {
  const parsedRows = removeEmptyColumns(parseRows(text))
  const headersPresent = hasHeaderRow(parsedRows)
  const headers = headersPresent
    ? parsedRows[0].map((header, index) => header || `Column ${index + 1}`)
    : parsedRows[0].map((_, index) => `Column ${index + 1}`)
  const rows = headersPresent ? parsedRows.slice(1) : parsedRows
  const series = createLongFormSeries(headers, rows) ?? createGenericSeries(headers, rows)

  if (series.length === 0) throw new Error('No usable data series found.')

  return { fileName, rowCount: rows.length, headers, series }
}

export function useCsvData() {
  const dataset = ref<ParsedDataset | null>(null)
  const visibleSeries = ref<Record<string, boolean>>({})
  const error = ref<string | null>(null)
  const isLoading = ref(false)

  const activeSeries = computed(() => dataset.value?.series.filter((series) => visibleSeries.value[series.id]) ?? [])

  async function importFile(file: File) {
    error.value = null
    isLoading.value = true
    try {
      const text = await readFile(file)
      if (!text.trim()) throw new Error('This CSV file is empty.')

      const nextDataset = createDataset(file.name, text)
      dataset.value = nextDataset
      visibleSeries.value = Object.fromEntries(nextDataset.series.map((series) => [series.id, false]))
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Could not import this CSV file.'
    } finally {
      isLoading.value = false
    }
  }

  function setSeriesVisibility(id: string, visible: boolean) {
    visibleSeries.value = { ...visibleSeries.value, [id]: visible }
  }

  function setAllSeriesVisibility(visible: boolean) {
    visibleSeries.value = Object.fromEntries((dataset.value?.series ?? []).map((series) => [series.id, visible]))
  }

  function reset() {
    dataset.value = null
    visibleSeries.value = {}
    error.value = null
  }

  return {
    activeSeries,
    dataset,
    error,
    importFile,
    isLoading,
    reset,
    setAllSeriesVisibility,
    setSeriesVisibility,
    visibleSeries,
  }
}
