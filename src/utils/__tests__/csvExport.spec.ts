import { describe, expect, it } from 'vitest'
import { createWideCsv, exportFileName } from '@/utils/csvExport'
import type { DataSeries } from '@/types/data'

const series: DataSeries[] = [
  {
    id: 'temperature',
    label: 'Temperature; inlet',
    unit: 'C',
    points: [
      { x: 0, xLabel: '00:00', y: 20 },
      { x: 1, xLabel: '00:01', y: null },
      { x: 2, xLabel: '00:02', y: 22 },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    unit: null,
    points: [
      { x: 0, xLabel: '00:00', y: 1.2 },
      { x: 1, xLabel: '00:01', y: 1.3 },
      { x: 2, xLabel: '00:02', y: 1.4 },
    ],
  },
]

describe('createWideCsv', () => {
  it('exports all series in the inclusive zoom range', () => {
    expect(createWideCsv(series, { min: 1, max: 2 })).toBe([
      'Time;"Temperature; inlet (C)";Pressure',
      '00:01;;1.3',
      '00:02;22;1.4',
    ].join('\r\n'))
  })

  it('uses source time labels and exports full range when requested', () => {
    expect(createWideCsv(series, { min: 0, max: 2 })).toContain('00:00;20;1.2')
  })
})

describe('exportFileName', () => {
  it('adds zoom suffix without duplicate CSV extension', () => {
    expect(exportFileName('telemetry.CSV')).toBe('telemetry-zoom.csv')
    expect(exportFileName('telemetry')).toBe('telemetry-zoom.csv')
  })
})
