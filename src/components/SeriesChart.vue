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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, synchronizedCrosshair, synchronizedSelection)

const props = defineProps<{
  series: DataSeries
  hoveredIndex: number | null
  zoomRange: Range | null
  selectedRange: Range | null
}>()

const emit = defineEmits<{
  hover: [index: number | null]
  wheel: [factor: number, anchorIndex: number]
  selection: [range: Range]
  select: [range: Range]
}>()

const lineChart = ref<{ chart: ChartJS } | null>(null)
let dragStartIndex: number | null = null

function formatElapsedTime(seconds: number): string {
  let wholeSeconds = Math.floor(seconds)
  let milliseconds = Math.round((seconds - wholeSeconds) * 1000)
  if (milliseconds === 1000) {
    wholeSeconds += 1
    milliseconds = 0
  }

  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainingSeconds = wholeSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

const lineData = computed<ChartData<'line'>>(() => ({
  labels: props.series.points.map((point) => formatElapsedTime(point.x)),
  datasets: [{
    label: props.series.unit ? `${props.series.label} (${props.series.unit})` : props.series.label,
    data: props.series.points.map((point) => point.y),
    borderColor: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.2,
  }],
}))

const hoveredPoint = computed(() => {
  if (props.hoveredIndex === null) return null
  return props.series.points[props.hoveredIndex] ?? null
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
      legend: { display: false },
      synchronizedCrosshair: { activeIndex: null },
      synchronizedSelection: { range: null },
      tooltip: { enabled: false },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } },
      y: { ticks: { maxTicksLimit: 6 }, grid: { color: '#e2e8f0' } },
    },
  }
}

const lineOptions = optionsBase() as ChartOptions<'line'>

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
    chart.setActiveElements([{ datasetIndex: 0, index: props.hoveredIndex }])
    chart.tooltip?.setActiveElements([{ datasetIndex: 0, index: props.hoveredIndex }], { x, y: chart.chartArea.top + 16 })
  }
  chart.update('none')
}

function syncZoom() {
  const chart = chartInstance()
  if (!chart) return

  const range = props.zoomRange ?? { min: 0, max: props.series.points.length - 1 }
  chart.options.scales!.x!.min = range.min
  chart.options.scales!.x!.max = range.max
  chart.update('none')
}

function indexAtClientX(clientX: number): number | null {
  const chart = chartInstance()
  if (!chart) return null
  const bounds = chart.canvas.getBoundingClientRect()
  const value = chart.scales.x.getValueForPixel(clientX - bounds.left)
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(props.series.points.length - 1, Math.round(value)))
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
  if (dragStartIndex === null) emit('hover', null)
}

function handleWheel(event: WheelEvent) {
  const anchorIndex = indexAtClientX(event.clientX)
  if (anchorIndex === null || event.deltaY === 0) return
  emit('wheel', event.deltaY < 0 ? 1.25 : 0.8, anchorIndex)
}

watch(() => props.hoveredIndex, () => nextTick(syncOverlays))
watch(() => props.selectedRange, () => nextTick(syncOverlays), { deep: true })
watch(() => props.zoomRange, () => nextTick(syncZoom), { deep: true })
onMounted(() => nextTick(() => {
  syncOverlays()
  syncZoom()
}))
</script>

<template>
  <article class="flex min-h-80 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <header class="mb-3 flex items-start justify-between gap-3">
      <h2 class="text-sm font-bold leading-5 text-slate-800">{{ series.label }}</h2>
      <span v-if="series.unit" class="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{{ series.unit }}</span>
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
      <template v-if="hoveredPoint">
        <span>Time: <strong class="font-semibold text-slate-700">{{ formatElapsedTime(hoveredPoint.x) }}</strong></span>
        <span>Value: <strong class="font-semibold text-slate-700">{{ formatValue(hoveredPoint.y) }}{{ hoveredPoint.y === null || !series.unit ? '' : ` ${series.unit}` }}</strong></span>
      </template>
      <span v-else>Move pointer over chart to inspect value.</span>
    </div>
  </article>
</template>
