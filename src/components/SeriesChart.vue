<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import type { DataSeries } from '@/types/data'

interface Range {
  min: number
  max: number
}

const synchronizedCrosshair: Plugin = {
  id: 'synchronizedCrosshair',
  afterDraw(chart, _args, options) {
    const activeIndex = (options as { activeIndex?: number | null }).activeIndex
    if (activeIndex === null || activeIndex === undefined) return

    const x = chart.scales.x.getPixelForValue(activeIndex)
    if (!Number.isFinite(x)) return

    const { ctx, chartArea } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#475569'
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  },
}

const synchronizedSelection: Plugin = {
  id: 'synchronizedSelection',
  beforeDatasetsDraw(chart, _args, options) {
    const range = (options as { range?: Range | null }).range
    if (!range) return

    const start = chart.scales.x.getPixelForValue(range.min)
    const end = chart.scales.x.getPixelForValue(range.max)
    const left = Math.max(chart.chartArea.left, Math.min(start, end))
    const right = Math.min(chart.chartArea.right, Math.max(start, end))
    if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) return

    chart.ctx.save()
    chart.ctx.fillStyle = 'rgba(14, 165, 233, 0.16)'
    chart.ctx.fillRect(left, chart.chartArea.top, right - left, chart.chartArea.bottom - chart.chartArea.top)
    chart.ctx.restore()
  },
}

const alignedZeroLine: Plugin = {
  id: 'alignedZeroLine',
  afterDraw(chart, _args, options) {
    const yAxisId = (options as { yAxisId?: string }).yAxisId
    const yAxis = yAxisId ? chart.scales[yAxisId] : undefined
    if (!yAxis) return

    const y = yAxis.getPixelForValue(0)
    if (!Number.isFinite(y) || y < chart.chartArea.top || y > chart.chartArea.bottom) return

    chart.ctx.save()
    chart.ctx.beginPath()
    chart.ctx.moveTo(chart.chartArea.left, y)
    chart.ctx.lineTo(chart.chartArea.right, y)
    chart.ctx.lineWidth = 1
    chart.ctx.strokeStyle = '#94a3b8'
    chart.ctx.stroke()
    chart.ctx.restore()
  },
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, synchronizedCrosshair, synchronizedSelection, alignedZeroLine)

const props = defineProps<{
  series: DataSeries[]
  combined?: boolean
  height?: number
  hoveredIndex: number | null
  zoomRange: Range | null
  selectedRange: Range | null
}>()

const emit = defineEmits<{
  hover: [index: number | null]
  wheel: [factor: number, anchorIndex: number]
  selection: [range: Range]
  select: [range: Range]
  resize: [height: number]
}>()

const lineChart = ref<{ chart: ChartJS } | null>(null)
let dragStartIndex: number | null = null
let resizeStartY: number | null = null
let resizeStartHeight = 0

const minimumHeight = 320
const maximumHeight = 1000
const chartHeight = computed(() => props.combined && props.height ? `${props.height}px` : undefined)

const seriesColors = [
  '#0284c7',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#db2777',
  '#65a30d',
]

const primarySeries = computed(() => props.series[0])
const pointCount = computed(() => primarySeries.value?.points.length ?? 0)

function combinedAxisRange(series: DataSeries): { min: number; max: number } {
  const values = series.points.flatMap((point) => point.y === null ? [] : [point.y])
  const minimum = Math.min(0, ...values)
  const maximum = Math.max(0, ...values)

  if (minimum === maximum) return { min: -1, max: 1 }
  if (minimum === 0) return { min: -maximum, max: maximum }
  if (maximum === 0) return { min: minimum, max: -minimum }

  const zeroRatio = Math.max(Math.abs(minimum), maximum)
  return { min: -zeroRatio, max: zeroRatio }
}

const combinedScales = computed(() => Object.fromEntries(props.series.map((series, index) => [
  `y${index}`,
  {
    type: 'linear' as const,
    display: false,
    min: combinedAxisRange(series).min,
    max: combinedAxisRange(series).max,
    grid: { display: false },
  },
])))

const lineData = computed<ChartData<'line'>>(() => ({
  labels: primarySeries.value?.points.map((point) => point.xLabel) ?? [],
  datasets: props.series.map((series, index) => {
    const color = props.combined ? seriesColors[index % seriesColors.length]! : '#0284c7'
    return {
      label: series.unit ? `${series.label} (${series.unit})` : series.label,
      data: series.points.map((point) => point.y),
      borderColor: color,
      backgroundColor: props.combined ? color : 'rgba(2, 132, 199, 0.16)',
      yAxisID: props.combined ? `y${index}` : 'y',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: !props.combined,
      tension: 0.2,
    }
  }),
}))

const hoveredPoints = computed(() => {
  const index = props.hoveredIndex
  if (index === null) return null
  return props.series.map((series) => ({ series, point: series.points[index] ?? null }))
})

function formatValue(value: number | null): string {
  return value === null ? 'No data' : value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function optionsBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    normalized: true,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { display: props.combined, position: 'bottom' as const, labels: { boxWidth: 12, usePointStyle: true } },
      synchronizedCrosshair: { activeIndex: null },
      synchronizedSelection: { range: null },
      tooltip: { enabled: false },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } },
      y: { beginAtZero: props.combined, ticks: { maxTicksLimit: 6 }, grid: { color: '#e2e8f0' } },
    },
  }
}

const lineOptions = computed<ChartOptions<'line'>>(() => {
  const options = optionsBase() as unknown as {
    scales: Record<string, unknown>
    plugins: Record<string, unknown>
  }
  if (props.combined) {
    options.scales = {
      x: options.scales.x,
      ...combinedScales.value,
    }
    options.plugins.alignedZeroLine = { yAxisId: 'y0' }
  }
  return options as ChartOptions<'line'>
})

function chartInstance(): ChartJS | null {
  return lineChart.value?.chart ?? null
}

function syncOverlays() {
  const chart = chartInstance()
  if (!chart) return

  const plugins = chart.options.plugins as unknown as {
    synchronizedCrosshair?: { activeIndex?: number | null }
    synchronizedSelection?: { range?: Range | null }
  }
  if (plugins.synchronizedCrosshair) plugins.synchronizedCrosshair.activeIndex = props.hoveredIndex
  if (plugins.synchronizedSelection) plugins.synchronizedSelection.range = props.selectedRange

  if (props.hoveredIndex === null) {
    chart.setActiveElements([])
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 })
  } else {
    const x = chart.scales.x.getPixelForValue(props.hoveredIndex)
    const elements = props.series.map((_series, datasetIndex) => ({ datasetIndex, index: props.hoveredIndex! }))
    chart.setActiveElements(elements)
    chart.tooltip?.setActiveElements(elements, { x, y: chart.chartArea.top + 16 })
  }
  chart.update('none')
}

function syncZoom() {
  const chart = chartInstance()
  if (!chart) return

  const range = props.zoomRange ?? { min: 0, max: pointCount.value - 1 }
  const xAxis = chart.options.scales?.x
  if (!xAxis) return
  xAxis.min = range.min
  xAxis.max = range.max
  chart.update('none')
}

function indexAtClientX(clientX: number): number | null {
  const chart = chartInstance()
  if (!chart) return null
  const bounds = chart.canvas.getBoundingClientRect()
  const value = chart.scales.x.getValueForPixel(clientX - bounds.left)
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(pointCount.value - 1, Math.round(value)))
}

function indexAtPointer(event: PointerEvent): number | null {
  return indexAtClientX(event.clientX)
}

function normalizedRange(start: number, end: number): Range {
  return { min: Math.min(start, end), max: Math.max(start, end) }
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const index = indexAtPointer(event)
  if (index === null) return
  dragStartIndex = index
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  const index = indexAtPointer(event)
  if (index === null) return
  if (dragStartIndex !== null) {
    emit('selection', normalizedRange(dragStartIndex, index))
  } else {
    emit('hover', index)
  }
}

function handlePointerUp(event: PointerEvent) {
  const index = indexAtPointer(event)
  const start = dragStartIndex
  dragStartIndex = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  if (start === null || index === null || start === index) return
  emit('select', normalizedRange(start, index))
}

function handlePointerLeave() {
  if (dragStartIndex === null && resizeStartY === null) emit('hover', null)
}

function handleResizeStart(event: PointerEvent) {
  resizeStartY = event.clientY
  resizeStartHeight = props.height ?? minimumHeight
  const target = event.currentTarget as HTMLElement
  if (target.setPointerCapture) target.setPointerCapture(event.pointerId)
}

function handleResizeMove(event: PointerEvent) {
  if (resizeStartY === null) return
  const height = Math.max(minimumHeight, Math.min(maximumHeight, resizeStartHeight + event.clientY - resizeStartY))
  emit('resize', height)
}

function handleResizeEnd(event: PointerEvent) {
  resizeStartY = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture?.(event.pointerId)
}

function handleWheel(event: WheelEvent) {
  const anchorIndex = indexAtClientX(event.clientX)
  if (anchorIndex === null || event.deltaY === 0) return
  emit('wheel', event.deltaY < 0 ? 1.25 : 0.8, anchorIndex)
}

watch(() => props.hoveredIndex, () => nextTick(syncOverlays))
watch(() => props.selectedRange, () => nextTick(syncOverlays), { deep: true })
watch(() => props.zoomRange, () => nextTick(syncZoom), { deep: true })
watch(() => props.series, () => nextTick(() => {
  syncOverlays()
  syncZoom()
}), { deep: true })
onMounted(() => nextTick(() => {
  syncOverlays()
  syncZoom()
}))
</script>

<template>
  <article class="flex min-h-80 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" :style="{ height: chartHeight }">
    <header class="mb-3 flex items-start justify-between gap-3">
      <h2 class="text-sm font-bold leading-5 text-slate-800">{{ combined ? 'All selected series' : primarySeries?.label }}</h2>
      <span v-if="!combined && primarySeries?.unit" class="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{{ primarySeries.unit }}</span>
    </header>
    <div
      class="min-h-0 flex-1 touch-none"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerLeave"
      @wheel.prevent="handleWheel"
    >
      <Line ref="lineChart" :data="lineData" :options="lineOptions" />
    </div>
    <div class="mt-3 flex min-h-6 items-center gap-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
      <template v-if="hoveredPoints">
        <span>Time: <strong class="font-semibold text-slate-700">{{ hoveredPoints[0]?.point?.xLabel }}</strong></span>
        <template v-for="{ series: item, point } in hoveredPoints" :key="item.id">
          <span><strong class="font-semibold text-slate-700">{{ combined ? `${item.label}: ` : 'Value: ' }}{{ formatValue(point?.y ?? null) }}{{ point?.y === null || !item.unit ? '' : ` ${item.unit}` }}</strong></span>
        </template>
      </template>
      <span v-else>Move pointer over chart to inspect value.</span>
    </div>
    <div
      v-if="combined"
      class="mt-2 -mb-2 flex h-3 shrink-0 cursor-row-resize items-center justify-center touch-none"
      role="separator"
      aria-label="Resize combined chart"
      aria-orientation="horizontal"
      @pointerdown="handleResizeStart"
      @pointermove="handleResizeMove"
      @pointerup="handleResizeEnd"
      @pointercancel="handleResizeEnd"
    ><span class="h-1 w-12 rounded-full bg-slate-300" /></div>
  </article>
</template>
