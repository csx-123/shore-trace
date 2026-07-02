<script setup>
import { RouterLink } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import { createHistorySummaries, getTomorrowFocusSummary } from '../domain/statistics.js'
import { studyRecordRepository } from '../repositories/studyRecordRepository.js'

const result = studyRecordRepository.getAll()
const repositoryError = result.error
const summaries = createHistorySummaries(result.data.records)

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return `${year}年${month}月${day}日`
}
</script>

<template>
  <main class="mx-auto min-h-svh max-w-md bg-transparent pb-20 text-[#26324a]">
    <header class="sticky top-0 z-10 border-b border-white/70 bg-white/85 px-5 py-4 shadow-sm shadow-[#92A8D1]/20 backdrop-blur-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold tracking-wide text-[#6E84B7]">历史记录</p>
          <h1 class="mt-1 text-2xl font-bold text-[#26324a]">学习记录历史</h1>
        </div>
        <RouterLink
          to="/record"
          class="rounded-xl bg-[#6E84B7] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#92A8D1]/30"
        >
          记录
        </RouterLink>
      </div>

      <p v-if="repositoryError" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        本地数据读取异常，已使用安全空数据展示。
      </p>
    </header>

    <div class="space-y-4 px-5 py-4">
      <section v-if="summaries.length === 0" class="rounded-2xl border border-dashed border-[#F7CAC9] bg-white/75 p-6 text-center shadow-sm">
        <h2 class="text-base font-bold text-slate-900">还没有历史记录</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          保存一条包含学习内容、今日收获或明日重点的记录后，会在这里出现。
        </p>
        <RouterLink
          to="/record"
          class="mt-4 inline-flex rounded-xl bg-[#6E84B7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          去记录
        </RouterLink>
      </section>

      <section v-else class="space-y-3">
        <RouterLink
          v-for="summary in summaries"
          :key="summary.date"
          :to="`/history/${summary.date}`"
          class="block rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur transition active:scale-[0.99]"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-slate-950">{{ formatDateLabel(summary.date) }}</div>
              <div class="mt-1 text-xs text-slate-500">
                {{ summary.moduleLabels.length ? summary.moduleLabels.join('、') : '仅记录收获/重点' }}
              </div>
            </div>
            <span class="rounded-full bg-[#F7CAC9]/45 px-2.5 py-1 text-xs font-semibold text-[#72515b]">查看</span>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-[#eef2fa] p-3">
              <div class="text-xs text-[#6E84B7]">学习</div>
              <div class="mt-1 text-lg font-bold">{{ summary.totals.studyMinutes }}</div>
              <div class="text-xs text-slate-500">分钟</div>
            </div>
            <div class="rounded-xl bg-[#eef2fa] p-3">
              <div class="text-xs text-[#6E84B7]">做题</div>
              <div class="mt-1 text-lg font-bold">{{ summary.totals.questionCount }}</div>
              <div class="text-xs text-slate-500">道</div>
            </div>
            <div class="rounded-xl bg-[#eef2fa] p-3">
              <div class="text-xs text-[#6E84B7]">错题</div>
              <div class="mt-1 text-lg font-bold">{{ summary.totals.wrongCount }}</div>
              <div class="text-xs text-slate-500">道</div>
            </div>
          </div>

          <p v-if="getTomorrowFocusSummary(summary.tomorrowFocus)" class="mt-3 rounded-xl bg-[#F7CAC9]/30 px-3 py-2 text-sm leading-6 text-[#72515b]">
            明日重点：{{ getTomorrowFocusSummary(summary.tomorrowFocus) }}
          </p>
        </RouterLink>
      </section>
    </div>

    <BottomNav />
  </main>
</template>
