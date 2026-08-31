<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckCheck, Search, SquareDashedMousePointer } from '@lucide/vue'
import FileUpload from './FileUpload.vue'
import type { DataSeries } from '@/types/data'

const props = defineProps<{
  series: DataSeries[]
  visibility: Record<string, boolean>
  fileName: string | null
  rowCount: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  import: [file: File]
  invalid: [message: string]
  toggle: [id: string, visible: boolean]
  toggleAll: [visible: boolean]
}>()

const search = ref('')
const filteredSeries = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return query ? props.series.filter((item) => item.label.toLocaleLowerCase().includes(query)) : props.series
})

function toggleSeries(id: string, event: Event) {
  emit('toggle', id, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-slate-200 bg-white p-4 lg:w-80 lg:p-5">
    <FileUpload @select="emit('import', $event)" @invalid="emit('invalid', $event)" />

    <div v-if="fileName" class="mt-4 rounded-xl bg-slate-100 px-3 py-2.5">
      <p class="truncate text-xs font-semibold text-slate-700">{{ fileName }}</p>
      <p class="mt-0.5 text-xs text-slate-500">{{ rowCount.toLocaleString() }} parsed rows</p>
    </div>

    <template v-if="series.length">
      <div class="mt-5 flex items-center justify-between">
        <h2 class="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">Data series</h2>
        <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">{{ series.length }}</span>
      </div>

      <label class="relative mt-3 block">
        <Search class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" :size="16" aria-hidden="true" />
        <input
          v-model="search"
          class="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          type="search"
          placeholder="Filter series"
        />
      </label>

      <div class="mt-3 flex gap-2">
        <button class="control-button" type="button" @click="emit('toggleAll', true)">
          <CheckCheck :size="14" aria-hidden="true" /> Select all
        </button>
        <button class="control-button" type="button" @click="emit('toggleAll', false)">
          <SquareDashedMousePointer :size="14" aria-hidden="true" /> Deselect all
        </button>
      </div>

      <div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p v-if="filteredSeries.length === 0" class="px-1 py-4 text-sm text-slate-500">No matching series.</p>
        <label
          v-for="item in filteredSeries"
          :key="item.id"
          class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
        >
          <input
            class="mt-0.5 size-4 shrink-0 accent-sky-600"
            type="checkbox"
            :checked="visibility[item.id]"
            @change="toggleSeries(item.id, $event)"
          />
          <span class="min-w-0 text-sm leading-5 text-slate-700">
            <span class="block break-words">{{ item.label }}</span>
            <span v-if="item.unit" class="text-xs text-slate-400">{{ item.unit }}</span>
          </span>
        </label>
      </div>
    </template>

    <p v-else-if="!isLoading" class="mt-5 text-sm leading-6 text-slate-500">Import a CSV file to select data series.</p>
  </aside>
</template>

<style scoped>
.control-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.4rem 0.55rem;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
}

.control-button:hover {
  background: #f8fafc;
  color: #0f172a;
}
</style>
