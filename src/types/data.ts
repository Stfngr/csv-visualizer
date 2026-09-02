export interface DataPoint {
  x: number
  xLabel: string
  y: number | null
}

export interface DataSeries {
  id: string
  label: string
  unit: string | null
  points: DataPoint[]
}

export interface ParsedDataset {
  fileName: string
  rowCount: number
  headers: string[]
  series: DataSeries[]
}
