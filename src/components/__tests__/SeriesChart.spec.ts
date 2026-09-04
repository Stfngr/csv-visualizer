import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SeriesChart from '@/components/SeriesChart.vue'
import type { DataSeries } from '@/types/data'

vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<canvas />',
  },
}))

const series: DataSeries[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    unit: 'C',
    points: [{ x: 0, xLabel: '00:00', y: 20 }, { x: 1, xLabel: '00:01', y: 21 }],
  },
  {
    id: 'flow',
    label: 'Flow',
    unit: 'l/min',
    points: [{ x: 0, xLabel: '00:00', y: 10 }, { x: 1, xLabel: '00:01', y: 12 }],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    unit: 'bar',
    points: [{ x: 0, xLabel: '00:00', y: 1 }, { x: 1, xLabel: '00:01', y: 2 }],
  },
]

function mountChart(combined = false) {
  return mount(SeriesChart, {
    props: { series, combined, hoveredIndex: null, zoomRange: null, selectedRange: null },
  })
}

describe('SeriesChart', () => {
  it('renders selected series together with distinct colors, labels, and zero baseline', () => {
    const wrapper = mountChart(true)
    const line = wrapper.findComponent({ name: 'Line' })
    const data = line.props('data') as { datasets: Array<{ label: string; borderColor: string; fill: boolean; yAxisID: string }> }
    const options = line.props('options') as {
      plugins: { legend: { display: boolean }; alignedZeroLine: { yAxisId: string } }
      scales: Record<string, { display?: boolean; min?: number; max?: number }>
    }

    expect(wrapper.text()).toContain('All selected series')
    expect(data.datasets).toMatchObject([
      { label: 'Temperature (C)', borderColor: '#0284c7', fill: false, yAxisID: 'y0' },
      { label: 'Flow (l/min)', borderColor: '#dc2626', fill: false, yAxisID: 'y1' },
      { label: 'Pressure (bar)', borderColor: '#16a34a', fill: false, yAxisID: 'y2' },
    ])
    expect(data.datasets).toHaveLength(series.length)
    expect(options.plugins.legend.display).toBe(true)
    expect(options.plugins.alignedZeroLine.yAxisId).toBe('y0')
    expect(options.scales.y0).toMatchObject({ display: false, min: -21, max: 21 })
    expect(options.scales.y1).toMatchObject({ display: false, min: -12, max: 12 })
    expect(options.scales.y2).toMatchObject({ display: false, min: -2, max: 2 })
  })

  it('keeps standalone charts blue and without a legend', () => {
    const wrapper = mountChart()
    const line = wrapper.findComponent({ name: 'Line' })
    const data = line.props('data') as { datasets: Array<{ borderColor: string; fill: boolean }> }
    const options = line.props('options') as { plugins: { legend: { display: boolean } } }

    expect(data.datasets[0]).toMatchObject({ borderColor: '#0284c7', fill: true })
    expect(options.plugins.legend.display).toBe(false)
  })

  it('resizes combined chart within supported bounds', async () => {
    const wrapper = mount(SeriesChart, {
      props: { series, combined: true, height: 480, hoveredIndex: null, zoomRange: null, selectedRange: null },
    })
    const handle = wrapper.get('[aria-label="Resize combined chart"]')

    await handle.element.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, pointerId: 1 }))
    await handle.element.dispatchEvent(new PointerEvent('pointermove', { clientY: 900, pointerId: 1 }))
    await handle.element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))

    expect(wrapper.emitted('resize')).toEqual([[1000]])
  })
})
