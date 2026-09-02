import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FileUpload from '@/components/FileUpload.vue'

describe('FileUpload', () => {
  it('emits select for CSV files dropped into upload area', async () => {
    const wrapper = mount(FileUpload)
    const file = new File(['value\n1'], 'data.csv', { type: 'text/plain' })

    await wrapper.trigger('drop', { dataTransfer: { files: [file] } })

    expect(wrapper.emitted('select')).toEqual([[file]])
    expect(wrapper.emitted('invalid')).toBeUndefined()
  })

  it('accepts files identified by text/csv MIME type', async () => {
    const wrapper = mount(FileUpload)
    const file = new File(['value\n1'], 'data', { type: 'text/csv' })

    await wrapper.trigger('drop', { dataTransfer: { files: [file] } })

    expect(wrapper.emitted('select')).toEqual([[file]])
  })

  it('emits validation error for unsupported files', async () => {
    const wrapper = mount(FileUpload)
    const file = new File(['not csv'], 'data.txt', { type: 'text/plain' })

    await wrapper.trigger('drop', { dataTransfer: { files: [file] } })

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('invalid')).toEqual([['Choose a CSV file with a .csv extension.']])
  })

  it('accepts CSV files up to 25 MB', async () => {
    const wrapper = mount(FileUpload)
    const file = new File([new Uint8Array(25 * 1024 * 1024)], 'data.csv', { type: 'text/csv' })

    await wrapper.trigger('drop', { dataTransfer: { files: [file] } })

    expect(wrapper.emitted('select')).toEqual([[file]])
    expect(wrapper.emitted('invalid')).toBeUndefined()
  })

  it('rejects CSV files larger than 25 MB', async () => {
    const wrapper = mount(FileUpload)
    const file = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'data.csv', { type: 'text/csv' })

    await wrapper.trigger('drop', { dataTransfer: { files: [file] } })

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('invalid')).toEqual([['File is 25.0 MB. Maximum supported size is 25 MB.']])
  })
})
