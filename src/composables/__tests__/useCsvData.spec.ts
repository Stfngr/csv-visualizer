import { describe, expect, it } from 'vitest'
import { createDataset } from '@/composables/useCsvData'

describe('createDataset', () => {
  it('groups long-form CSV data and preserves source time labels', () => {
    const dataset = createDataset('engine.csv', [
      'SECONDS;PID;VALUE;UNITS',
      '0001.50;RPM;800;rpm',
      '0001.50;Voltage;12.4;V',
      '0002.00;RPM;850;rpm',
    ].join('\n'))

    expect(dataset.fileName).toBe('engine.csv')
    expect(dataset.rowCount).toBe(3)
    expect(dataset.series).toHaveLength(2)
    expect(dataset.series[0]).toMatchObject({
      id: 'RPM',
      unit: 'rpm',
      points: [
        { x: 1.5, xLabel: '0001.50', y: 800 },
        { x: 2, xLabel: '0002.00', y: 850 },
      ],
    })
    expect(dataset.series[1].points).toEqual([
      { x: 1.5, xLabel: '0001.50', y: 12.4 },
      { x: 2, xLabel: '0002.00', y: null },
    ])
  })

  it('uses first numeric column as generic CSV x-axis and preserves its text', () => {
    const dataset = createDataset('measurements.csv', [
      'Time,Temperature,Pressure',
      '001.00,20.5,1012',
      '002.00,21.0,1013',
    ].join('\n'))

    expect(dataset.series.map((series) => series.label)).toEqual(['Temperature', 'Pressure'])
    expect(dataset.series[0].points).toEqual([
      { x: 1, xLabel: '001.00', y: 20.5 },
      { x: 2, xLabel: '002.00', y: 21 },
    ])
  })

  it('uses row numbers when generic CSV has no x-axis column', () => {
    const dataset = createDataset('values.csv', 'Label,Value\nFirst,10\nSecond,20')

    expect(dataset.series[0].points).toEqual([
      { x: 1, xLabel: '1', y: 10 },
      { x: 2, xLabel: '2', y: 20 },
    ])
  })

  it('rejects files without data rows or numeric columns', () => {
    expect(() => createDataset('empty.csv', 'Name,Value')).toThrow('CSV needs a header row and at least one data row.')
    expect(() => createDataset('text.csv', 'Name,State\nAlpha,Open\nBeta,Closed')).toThrow('No numeric columns found to chart.')
  })
})
