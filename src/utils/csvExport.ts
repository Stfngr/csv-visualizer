import type { DataSeries } from '@/types/data'

interface Range {
  min: number
  max: number
}

function escapeCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function seriesHeader(series: DataSeries): string {
  return series.unit ? `${series.label} (${series.unit})` : series.label
}

export function createWideCsv(series: DataSeries[], range: Range): string {
  if (series.length === 0) return ''

  const first = series[0]!
  const header = ['Time', ...series.map(seriesHeader)].map(escapeCell).join(';')
  const rows = Array.from({ length: range.max - range.min + 1 }, (_, offset) => {
    const index = range.min + offset
    return [first.points[index]?.xLabel ?? '', ...series.map((item) => item.points[index]?.y ?? null)]
      .map(escapeCell)
      .join(';')
  })

  return [header, ...rows].join('\r\n')
}

export function exportFileName(fileName: string): string {
  return `${fileName.replace(/\.csv$/i, '') || 'data'}-zoom.csv`
}
