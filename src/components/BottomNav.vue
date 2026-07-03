<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const activeKey = computed(() => {
  if (route.path.startsWith('/statistics')) {
    return 'statistics'
  }
  if (route.path.startsWith('/history')) {
    return 'history'
  }
  return 'record'
})
</script>

<template>
  <nav class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#e6ebf4] bg-white/95 px-6 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
    <div class="grid grid-cols-3">
      <RouterLink
        to="/record"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 text-sm font-bold transition active:scale-[0.98]"
        :class="
          activeKey === 'record'
            ? 'text-[#2f6eea]'
            : 'text-slate-500'
        "
      >
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 4.75h8A2.25 2.25 0 0 1 18.25 7v10A2.25 2.25 0 0 1 16 19.25H8A2.25 2.25 0 0 1 5.75 17V7A2.25 2.25 0 0 1 8 4.75Z"
            stroke="currentColor"
            stroke-width="1.8"
          />
          <path d="M9 9h6M9 12h6M9 15h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        记录
      </RouterLink>
      <RouterLink
        to="/history"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 text-sm font-bold transition active:scale-[0.98]"
        :class="
          activeKey === 'history'
            ? 'text-[#2f6eea]'
            : 'text-slate-500'
        "
      >
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5.75a6.25 6.25 0 1 1-5.42 3.14"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path d="M5.5 5.75v3.5H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M12 9v3.4l2.2 1.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        历史
      </RouterLink>
      <RouterLink
        to="/statistics"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 text-sm font-bold transition active:scale-[0.98]"
        :class="
          activeKey === 'statistics'
            ? 'text-[#2f6eea]'
            : 'text-slate-500'
        "
      >
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.75 18.25V12.5M12 18.25V6.75M17.25 18.25v-8"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M5.25 18.25h13.5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        统计
      </RouterLink>
    </div>
  </nav>
</template>
