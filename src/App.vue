<script setup lang="ts">
import { computed, ref } from 'vue'
import { Combine, Download, LineChart, Minus, Plus, Printer, RotateCcw, ShieldCheck, X } from '@lucide/vue'
import FileUpload from '@/components/FileUpload.vue'
import SeriesChart from '@/components/SeriesChart.vue'
import SeriesSidebar from '@/components/SeriesSidebar.vue'
import { useCsvData } from '@/composables/useCsvData'
import { createWideCsv, exportFileName } from '@/utils/csvExport'

const {
  activeSeries,
  dataset,
  error,
  importFile,
  isLoading,
  reset,
  setAllSeriesVisibility,
  setSeriesVisibility,
  visibleSeries,
} = useCsvData()

const fileName = computed(() => dataset.value?.fileName ?? null)
const rowCount = computed(() => dataset.value?.rowCount ?? 0)
const allSeries = computed(() => dataset.value?.series ?? [])
const hoveredIndex = ref<number | null>(null)
const zoomRange = ref<{ min: number; max: number } | null>(null)
const selectedRange = ref<{ min: number; max: number } | null>(null)
const isCombinedView = ref(false)
const combinedChartHeight = ref(480)
const selectAllWarningCount = ref<number | null>(null)
const activeSeriesKey = computed(() => activeSeries.value.map((series) => series.id).join('|'))
const maxIndex = computed(() => Math.max(0, (allSeries.value[0]?.points.length ?? 1) - 1))
const currentZoomRange = computed(() => zoomRange.value ?? { min: 0, max: maxIndex.value })
const zoomSpan = computed(() => currentZoomRange.value.max - currentZoomRange.value.min)
const maximumPanOffset = computed(() => Math.max(0, maxIndex.value - zoomSpan.value))
const isZoomed = computed(() => zoomSpan.value < maxIndex.value)

function showUploadError(message: string) {
  error.value = message
}

function resetData() {
  hoveredIndex.value = null
  zoomRange.value = null
  selectedRange.value = null
  isCombinedView.value = false
  combinedChartHeight.value = 480
  selectAllWarningCount.value = null
  reset()
}

async function importData(file: File) {
  hoveredIndex.value = null
  zoomRange.value = null
  selectedRange.value = null
  isCombinedView.value = false
  combinedChartHeight.value = 480
  selectAllWarningCount.value = null
  await importFile(file)
}

function handleToggleAll(visible: boolean) {
  if (!visible) {
    setAllSeriesVisibility(false)
    return
  }

  const newlySelected = allSeries.value.filter((series) => !visibleSeries.value[series.id]).length
  if (newlySelected > 10) {
    selectAllWarningCount.value = newlySelected
    return
  }
  setAllSeriesVisibility(true)
}

function confirmSelectAll() {
  setAllSeriesVisibility(true)
  selectAllWarningCount.value = null
}

function zoomBy(factor: number, anchorIndex?: number) {
  const maximum = maxIndex.value
  if (maximum < 1) return

  const current = zoomRange.value ?? { min: 0, max: maximum }
  const span = current.max - current.min
  const nextSpan = Math.min(maximum, Math.max(1, span / factor))
  const anchor = Math.max(current.min, Math.min(current.max, anchorIndex ?? (current.min + current.max) / 2))
  const anchorRatio = span === 0 ? 0.5 : (anchor - current.min) / span
  let min = anchor - nextSpan * anchorRatio
  let max = min + nextSpan

  if (min < 0) {
    max -= min
    min = 0
  }
  if (max > maximum) {
    min -= max - maximum
    max = maximum
  }
  zoomRange.value = { min: Math.floor(Math.max(0, min)), max: Math.ceil(max) }
}

function resetZoom() {
  zoomRange.value = null
  selectedRange.value = null
}

function panTo(offset: number) {
  const min = Math.max(0, Math.min(maximumPanOffset.value, Math.round(offset)))
  zoomRange.value = { min, max: min + zoomSpan.value }
}

function handlePan(event: Event) {
  panTo(Number((event.target as HTMLInputElement).value))
}

function applySelection(range: { min: number; max: number }) {
  selectedRange.value = range
  zoomRange.value = range
}

function exportVisibleRange() {
  if (!dataset.value || allSeries.value.length === 0) return

  const csv = createWideCsv(allSeries.value, currentZoomRange.value)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName(dataset.value.fileName)
  link.click()
  URL.revokeObjectURL(url)
}

function printCharts() {
  if (activeSeries.value.length === 0) return
  window.print()
}

</script>

<template>
  <main class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <header class="app-header flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div class="flex items-center gap-3">
        <div class="rounded-xl bg-slate-900 p-2 text-white"><LineChart :size="22" aria-hidden="true" /></div>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Local CSV Visualizer</h1>
          <p class="text-xs text-slate-500">Browser-only analysis. Your data stays on this device.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          :class="isCombinedView ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
          type="button"
          title="Show all selected series in one chart"
          :disabled="activeSeries.length === 0"
          :aria-pressed="isCombinedView"
          @click="isCombinedView = !isCombinedView"
        ><Combine :size="15" /> {{ isCombinedView ? 'Separate charts' : 'Combine charts' }}</button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          title="Download all series in current zoom range"
          :disabled="!dataset"
          @click="exportVisibleRange"
        ><Download :size="15" /> Export range</button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          title="Print visible charts in current zoom range"
          :disabled="activeSeries.length === 0"
          @click="printCharts"
        ><Printer :size="15" /> Print charts</button>
        <div class="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button class="chart-toggle" type="button" title="Zoom in" :disabled="maxIndex < 1" @click="zoomBy(1.25)"><Plus :size="15" /> Zoom in</button>
          <button class="chart-toggle" type="button" title="Zoom out" :disabled="maxIndex < 1" @click="zoomBy(0.8)"><Minus :size="15" /> Zoom out</button>
          <button class="chart-toggle" type="button" title="Reset zoom" :disabled="!zoomRange" @click="resetZoom"><RotateCcw :size="15" /> Reset zoom</button>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          :disabled="!selectedRange"
          @click="selectedRange = null"
        ><X :size="15" /> Clear selection</button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          :disabled="!dataset"
          @click="resetData"
        ><RotateCcw :size="15" /> Reset data</button>
      </div>
    </header>

    <p v-if="error" class="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6" role="alert">
      {{ error }}
    </p>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <SeriesSidebar
        class="app-sidebar"
        :series="allSeries"
        :visibility="visibleSeries"
        :file-name="fileName"
        :row-count="rowCount"
        :is-loading="isLoading"
        @toggle="setSeriesVisibility"
        @toggle-all="handleToggleAll"
      />

      <section class="chart-content min-w-0 flex-1 p-4 sm:p-6" :class="{ 'print-combined': isCombinedView }">
        <div v-if="dataset && activeSeries.length && isZoomed" class="timeline-control mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="mb-2 flex items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <span>Timeline position</span>
            <span>{{ currentZoomRange.min.toLocaleString() }} - {{ currentZoomRange.max.toLocaleString() }}</span>
          </div>
          <input
            class="w-full accent-sky-700"
            type="range"
            min="0"
            :max="maximumPanOffset"
            step="1"
            :value="currentZoomRange.min"
            aria-label="Pan chart timeline"
            @input="handlePan"
          />
        </div>
        <div v-if="isLoading" class="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white">
          <p class="text-sm font-medium text-slate-600">Reading and parsing CSV locally...</p>
        </div>

        <div v-else-if="!dataset" class="min-h-96">
          <FileUpload class="min-h-96" @select="importData" @invalid="showUploadError" />
        </div>

        <div v-else-if="activeSeries.length === 0" class="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <h2 class="text-lg font-bold">No data series selected</h2>
            <p class="mt-2 text-sm text-slate-500">Select one or more series in sidebar to show charts.</p>
          </div>
        </div>

        <SeriesChart
          v-else-if="isCombinedView"
          :key="`combined:${activeSeriesKey}`"
          :series="activeSeries"
          combined
          :height="combinedChartHeight"
          :hovered-index="hoveredIndex"
          :zoom-range="zoomRange"
          :selected-range="selectedRange"
          @hover="hoveredIndex = $event"
          @wheel="zoomBy"
          @selection="selectedRange = $event"
          @select="applySelection"
          @resize="combinedChartHeight = $event"
        />

        <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SeriesChart
            v-for="series in activeSeries"
            :key="`separate:${series.id}`"
            :series="[series]"
            :hovered-index="hoveredIndex"
            :zoom-range="zoomRange"
            :selected-range="selectedRange"
            @hover="hoveredIndex = $event"
            @wheel="zoomBy"
            @selection="selectedRange = $event"
            @select="applySelection"
          />
        </div>
      </section>
    </div>

    <footer class="app-footer flex items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
      <ShieldCheck :size="14" class="text-emerald-600" aria-hidden="true" />
      No uploads, analytics, or external data requests.
    </footer>

    <div v-if="selectAllWarningCount !== null" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
      <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="select-all-warning-title">
        <h2 id="select-all-warning-title" class="text-lg font-bold text-slate-900">Select all series?</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Selecting {{ selectAllWarningCount }} series can slow down rendering and interaction.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" @click="selectAllWarningCount = null">No</button>
          <button class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" @click="confirmSelectAll">Yes, select all</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.chart-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.375rem;
  padding: 0.375rem 0.625rem;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 600;
}

@media print {
  :global(@page) {
    size: landscape;
    margin: 12mm;
  }

  .app-header,
  .app-sidebar,
  .app-footer,
  .timeline-control,
  :global([role="alert"]),
  :global([role="dialog"]),
  :global([aria-label="Resize combined chart"]) {
    display: none !important;
  }

  main {
    display: block;
    min-height: 0;
    background: white;
  }

  .chart-content {
    padding: 0;
  }

  :global(.chart-content > .grid) {
    display: block;
  }

  :global(.chart-content article) {
    height: 82mm !important;
    margin: 0 0 6mm;
    break-inside: avoid;
    box-shadow: none;
  }

  .print-combined :global(article) {
    height: 170mm !important;
  }
}

</style>
