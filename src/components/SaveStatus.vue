<script setup>
import { computed } from 'vue'
import { SAVE_STATUS } from '../domain/saveState.js'
import { formatTime } from '../utils/date.js'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  lastSavedAt: {
    type: String,
    default: '',
  },
})

const statusText = computed(() => {
  const map = {
    [SAVE_STATUS.SAVED]: '已保存',
    [SAVE_STATUS.EDITING]: '正在编辑',
    [SAVE_STATUS.DIRTY]: '存在未保存修改',
    [SAVE_STATUS.INVALID]: '存在校验问题',
    [SAVE_STATUS.SAVE_FAILED]: '保存失败',
  }
  return map[props.status] || '正在编辑'
})

const statusClass = computed(() => {
  const map = {
    [SAVE_STATUS.SAVED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    [SAVE_STATUS.EDITING]: 'bg-blue-50 text-blue-700 ring-blue-200',
    [SAVE_STATUS.DIRTY]: 'bg-amber-50 text-amber-700 ring-amber-200',
    [SAVE_STATUS.INVALID]: 'bg-rose-50 text-rose-700 ring-rose-200',
    [SAVE_STATUS.SAVE_FAILED]: 'bg-red-50 text-red-700 ring-red-200',
  }
  return map[props.status] || map.editing
})
</script>

<template>
  <div class="flex max-w-[9rem] flex-wrap justify-end gap-1.5 text-xs">
    <span class="rounded-full px-3 py-1 font-semibold shadow-sm ring-1" :class="statusClass">
      {{ statusText }}
    </span>
    <span v-if="lastSavedAt" class="text-slate-500">最后保存 {{ formatTime(lastSavedAt) }}</span>
  </div>
</template>
