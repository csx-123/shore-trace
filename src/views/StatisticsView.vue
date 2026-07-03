<script setup>
import { RouterLink } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import { createStatisticsSummary, formatCorrectRate } from '../domain/statistics.js'
import { studyRecordRepository } from '../repositories/studyRecordRepository.js'
import { getLocalDateKey } from '../utils/date.js'

const result = studyRecordRepository.getAll()
const repositoryError = result.error
const summary = createStatisticsSummary(result.data.records, getLocalDateKey())
const allTimeActiveModuleStats = summary.allTime.moduleStats.filter(
  (module) => module.studyMinutes > 0 || module.questionCount > 0 || module.wrongCount > 0,
)
const weekModuleStats = summary.currentWeek.moduleStats
const maxAllTimeModuleMinutes = Math.max(...allTimeActiveModuleStats.map((module) => module.studyMinutes), 1)
const maxWeekModuleMinutes = Math.max(...weekModuleStats.map((module) => module.studyMinutes), 1)
const maxWeekWrongReasonCount = Math.max(...summary.currentWeek.wrongReasonRanking.map((reason) => reason.count), 1)

function formatWeekRange(range) {
  return `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}`
}

function formatDateLabel(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number)
  return `${month}.${day}`
}

function getModuleBarWidth(minutes, maxMinutes) {
  return `${Math.max((minutes / maxMinutes) * 100, 4)}%`
}

function getWrongReasonBarWidth(count) {
  return `${Math.max((count / maxWeekWrongReasonCount) * 100, 8)}%`
}

function formatObservation(observation) {
  if (observation.type === 'lowestAccuracyModule') {
    return `本周${observation.moduleLabel}正确率最低，样本 ${observation.questionCount} 题。`
  }

  if (observation.type === 'highFrequencyWrongReason') {
    return `本周“${observation.tag}”出现 ${observation.count} 次。`
  }

  if (observation.type === 'unrecordedModule') {
    return `本周${observation.moduleLabel}尚未记录。`
  }

  return ''
}
</script>

<template>
  <main class="mx-auto min-h-svh max-w-md bg-transparent pb-20 text-[#26324a]">
    <header class="sticky top-0 z-10 border-b border-white/70 bg-white/85 px-5 py-4 shadow-sm shadow-[#92A8D1]/20 backdrop-blur-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold tracking-wide text-[#6E84B7]">统计概览</p>
          <h1 class="mt-1 text-2xl font-bold text-[#26324a]">学习统计</h1>
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
      <section v-if="summary.totalStudyDays === 0" class="rounded-2xl border border-dashed border-[#F7CAC9] bg-white/75 p-6 text-center shadow-sm">
        <h2 class="text-base font-bold text-slate-900">还没有可统计的数据</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          保存一条包含学习内容、今日收获或明日重点的记录后，会在这里生成统计。
        </p>
        <RouterLink
          to="/record"
          class="mt-4 inline-flex rounded-xl bg-[#6E84B7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          去记录
        </RouterLink>
      </section>

      <template v-else>
        <section class="rounded-2xl bg-[#6E84B7] p-4 shadow-lg shadow-[#92A8D1]/40">
          <div class="text-xs font-semibold text-[#eef2fa]">累计概览</div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <div class="text-xs text-[#eef2fa]">学习天数</div>
              <div class="mt-1 text-xl font-bold text-white">{{ summary.allTime.studyDays }}</div>
              <div class="text-xs text-[#e3e9f5]">天</div>
            </div>
            <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <div class="text-xs text-[#eef2fa]">学习时长</div>
              <div class="mt-1 text-xl font-bold text-white">{{ summary.allTime.studyMinutes }}</div>
              <div class="text-xs text-[#e3e9f5]">分钟</div>
            </div>
            <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <div class="text-xs text-[#eef2fa]">正确率</div>
              <div class="mt-1 text-xl font-bold text-white">{{ formatCorrectRate(summary.allTime.correctRate) || '暂无' }}</div>
              <div class="text-xs text-[#e3e9f5]">累计</div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <div class="flex items-start justify-between gap-3">
            <div>
            <h2 class="text-base font-bold text-slate-950">本周</h2>
              <p class="mt-1 text-xs text-slate-500">{{ formatWeekRange(summary.weekRange) }}</p>
            </div>
            <span class="rounded-full bg-[#F7CAC9]/45 px-2.5 py-1 text-xs font-semibold text-[#72515b]">
              周一开始
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-[#eef2fa] p-3">
              <div class="text-xs text-[#6E84B7]">学习天数</div>
              <div class="mt-1 text-lg font-bold">{{ summary.currentWeek.studyDays }}</div>
              <div class="text-xs text-slate-500">天</div>
            </div>
            <div class="rounded-xl bg-[#eef2fa] p-3">
              <div class="text-xs text-[#6E84B7]">学习时长</div>
              <div class="mt-1 text-lg font-bold">{{ summary.currentWeek.studyMinutes }}</div>
              <div class="text-xs text-slate-500">分钟</div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <h2 class="text-base font-bold text-slate-950">全部时间模块累计</h2>
          <div v-if="allTimeActiveModuleStats.length" class="mt-4 space-y-3">
            <article v-for="module in allTimeActiveModuleStats" :key="module.key">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-slate-800">{{ module.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ module.studyMinutes }} 分钟 · {{ module.questionCount }} 题 · 正确率 {{ formatCorrectRate(module.correctRate) || '暂无' }}
                  </div>
                </div>
                <div class="shrink-0 text-sm font-bold text-[#6E84B7]">{{ module.wrongCount }} 错</div>
              </div>
              <div class="mt-2 h-2 rounded-full bg-[#eef2fa]">
                <div class="h-2 rounded-full bg-[#92A8D1]" :style="{ width: getModuleBarWidth(module.studyMinutes, maxAllTimeModuleMinutes) }"></div>
              </div>
            </article>
          </div>
          <p v-else class="mt-3 text-sm leading-6 text-slate-500">
            当前记录只有收获或明日重点，暂无模块统计。
          </p>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <h2 class="text-base font-bold text-slate-950">本周模块</h2>
          <div class="mt-4 space-y-3">
            <article v-for="module in weekModuleStats" :key="module.key">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-slate-800">{{ module.label }}</div>
                  <div v-if="module.hasRecord" class="mt-1 text-xs text-slate-500">
                    {{ module.studyMinutes }} 分钟 · {{ module.questionCount }} 题 · 正确率 {{ formatCorrectRate(module.correctRate) || '暂无' }}
                  </div>
                  <div v-else class="mt-1 text-xs text-slate-500">本周尚未记录</div>
                </div>
                <div class="shrink-0 text-sm font-bold text-[#6E84B7]">{{ module.hasRecord ? `${module.wrongCount} 错` : '-' }}</div>
              </div>
              <div v-if="module.hasRecord" class="mt-2 h-2 rounded-full bg-[#eef2fa]">
                <div class="h-2 rounded-full bg-[#92A8D1]" :style="{ width: getModuleBarWidth(module.studyMinutes, maxWeekModuleMinutes) }"></div>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <h2 class="text-base font-bold text-slate-950">本周观察</h2>
          <div v-if="summary.currentWeek.observations.length" class="mt-3 space-y-2">
            <p
              v-for="observation in summary.currentWeek.observations"
              :key="`${observation.type}-${observation.moduleKey || observation.tag || observation.count}`"
              class="rounded-xl bg-[#eef2fa] px-3 py-2 text-sm leading-6 text-[#4d5f8f]"
            >
              {{ formatObservation(observation) }}
            </p>
          </div>
          <p v-else class="mt-3 rounded-xl bg-[#eef2fa] px-3 py-2 text-sm leading-6 text-slate-500">
            数据不足，暂不判断。
          </p>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <h2 class="text-base font-bold text-slate-950">本周固定错因</h2>
          <div v-if="summary.currentWeek.wrongReasonRanking.length" class="mt-4 space-y-3">
            <article v-for="reason in summary.currentWeek.wrongReasonRanking" :key="reason.tag">
              <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-slate-800">{{ reason.tag }}</div>
                <div class="text-sm font-bold text-[#72515b]">{{ reason.count }} 次</div>
              </div>
              <div class="mt-2 h-2 rounded-full bg-[#F7CAC9]/35">
                <div class="h-2 rounded-full bg-[#F7CAC9]" :style="{ width: getWrongReasonBarWidth(reason.count) }"></div>
              </div>
            </article>
          </div>
          <p v-else class="mt-3 text-sm leading-6 text-slate-500">
            本周暂无固定错因记录。
          </p>
        </section>
      </template>
    </div>

    <BottomNav />
  </main>
</template>
