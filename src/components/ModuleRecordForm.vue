<script setup>
import { ref } from 'vue'
import { WRONG_REASON_TAGS } from '../domain/constants.js'

const props = defineProps({
  moduleInfo: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['toggle-reason'])
const customReasonText = ref('')

const vAutoresize = {
  mounted: resizeTextarea,
  updated: resizeTextarea,
}

function resizeTextarea(element) {
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

function addCustomReason() {
  const reason = customReasonText.value.trim()
  if (!reason) {
    return
  }

  if (!Array.isArray(props.modelValue.customWrongReasons)) {
    props.modelValue.customWrongReasons = []
  }

  if (!props.modelValue.customWrongReasons.includes(reason)) {
    props.modelValue.customWrongReasons.push(reason)
  }

  customReasonText.value = ''
}

function removeCustomReason(reason) {
  const index = props.modelValue.customWrongReasons.indexOf(reason)
  if (index >= 0) {
    props.modelValue.customWrongReasons.splice(index, 1)
  }
}
</script>

<template>
  <section class="rounded-2xl bg-white/90 p-3.5 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
    <div class="flex items-center gap-2">
      <span class="h-2.5 w-2.5 rounded-full bg-[#F7CAC9] ring-4 ring-[#F7CAC9]/25"></span>
      <h3 class="text-base font-bold text-slate-950">{{ moduleInfo.label }}</h3>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <label class="block">
        <span class="text-xs text-slate-500">学习分钟</span>
        <input
          v-model="modelValue.studyMinutes"
          inputmode="numeric"
          class="mt-1 w-full rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-2.5 py-2 text-base outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
          placeholder="0"
        />
        <span v-if="errors.studyMinutes" class="mt-1 block text-xs text-rose-600">{{ errors.studyMinutes }}</span>
      </label>

      <label class="block">
        <span class="text-xs text-slate-500">做题数</span>
        <input
          v-model="modelValue.questionCount"
          inputmode="numeric"
          class="mt-1 w-full rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-2.5 py-2 text-base outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
          placeholder="0"
        />
        <span v-if="errors.questionCount" class="mt-1 block text-xs text-rose-600">{{ errors.questionCount }}</span>
      </label>

      <label class="block">
        <span class="text-xs text-slate-500">错题数</span>
        <input
          v-model="modelValue.wrongCount"
          inputmode="numeric"
          class="mt-1 w-full rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-2.5 py-2 text-base outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
          placeholder="0"
        />
        <span v-if="errors.wrongCount" class="mt-1 block text-xs text-rose-600">{{ errors.wrongCount }}</span>
      </label>
    </div>

    <div class="mt-3">
      <div class="flex items-center justify-between gap-3">
        <div class="text-xs text-slate-500">固定错因</div>
        <div class="text-[11px] text-slate-400">横向滑动选择</div>
      </div>
      <div class="mt-2 grid grid-flow-col grid-rows-2 auto-cols-[5.75rem] gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <button
          v-for="tag in WRONG_REASON_TAGS"
          :key="tag"
          type="button"
          class="min-h-9 whitespace-nowrap rounded-xl border px-2 py-1.5 text-xs font-medium transition active:scale-[0.98]"
          :class="
            modelValue.wrongReasonTags.includes(tag)
              ? 'border-[#92A8D1] bg-[#92A8D1] text-white shadow-sm shadow-[#92A8D1]/30'
              : 'border-[#dbe3f2] bg-[#f7f9fd] text-slate-700 hover:border-[#92A8D1] hover:bg-white'
          "
          @click="emit('toggle-reason', tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="mt-3">
      <div class="text-xs text-slate-500">自定义错因</div>
      <div class="mt-2 flex gap-2">
        <input
          v-model="customReasonText"
          class="min-w-0 flex-1 rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-3 py-2 text-sm outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
          placeholder="例如：概念混淆"
          @blur="addCustomReason"
          @keydown.enter.prevent="addCustomReason"
        />
        <button
          type="button"
          class="rounded-xl bg-[#6E84B7] px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
          @click="addCustomReason"
        >
          添加
        </button>
      </div>
      <div v-if="modelValue.customWrongReasons?.length" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="reason in modelValue.customWrongReasons"
          :key="reason"
          type="button"
          class="rounded-full border border-[#F7CAC9] bg-[#F7CAC9]/35 px-3 py-2 text-xs font-medium text-[#72515b]"
          @click="removeCustomReason(reason)"
        >
          {{ reason }} ×
        </button>
      </div>
    </div>

    <label class="mt-3 block">
      <span class="text-xs text-slate-500">模块备注</span>
      <textarea
        v-autoresize
        v-model="modelValue.note"
        rows="1"
        style="overflow: hidden"
        class="mt-1 w-full resize-none rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
        placeholder="一句话复盘，比如：资料定位慢，明天先练关键词。"
      />
    </label>
  </section>
</template>
