<script setup lang="ts">
import { ref } from 'vue'
import { FileUp, Upload } from '@lucide/vue'

const emit = defineEmits<{
  select: [file: File]
  invalid: [message: string]
}>()

const input = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function isCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
}

function selectFile(file: File | undefined) {
  if (!file) return
  if (!isCsv(file)) {
    emit('invalid', 'Choose a CSV file with a .csv extension.')
    return
  }
  emit('select', file)
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  selectFile(event.dataTransfer?.files[0])
}

function onPickerChange(event: Event) {
  selectFile((event.target as HTMLInputElement).files?.[0])
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div
    class="rounded-2xl border border-dashed p-4 transition"
    :class="isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50'"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" class="hidden" type="file" accept=".csv,text/csv" @change="onPickerChange" />
    <div class="flex items-start gap-3">
      <div class="rounded-xl bg-sky-100 p-2 text-sky-700">
        <FileUp :size="20" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-800">Import CSV data</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">Drop file here or browse. Data never leaves this browser.</p>
        <button
          class="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          type="button"
          @click="input?.click()"
        >
          <Upload :size="14" aria-hidden="true" />
          Choose file
        </button>
      </div>
    </div>
  </div>
</template>
