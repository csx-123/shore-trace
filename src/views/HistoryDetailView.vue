<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import { getRecordEditPath, summarizeRecord } from '../domain/statistics.js'
import { studyRecordRepository } from '../repositories/studyRecordRepository.js'
import { formatTime, isDateKey } from '../utils/date.js'

const route = useRoute()
const date = computed(() => String(route.params.date || ''))
const result = computed(() => (isDateKey(date.value) ? studyRecordRepository.getByDate(date.value) : { record: null, error: null }))
const repositoryError = computed(() => result.value.error)
const detail = computed(() => summarizeRecord(result.value.record))
const editPath = computed(() => getRecordEditPath(date.value))

function formatDateLabel(dateKey) {
  if (!isDateKey(dateKey)) {
    return dateKey
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  return `${year}年${month}月${day}日`
}
</script>

<template>
  <main class="mx-auto min-h-svh max-w-md bg-transparent pb-20 text-[#26324a]">
    <header class="sticky top-0 z-10 border-b border-white/70 bg-white/85 px-5 py-4 shadow-sm shadow-[#92A8D1]/20 backdrop-blur-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold tracking-wide text-[#6E84B7]">历史详情</p>
          <h1 class="mt-1 text-2xl font-bold text-[#26324a]">{{ formatDateLabel(date) }}</h1>
        </div>
        <RouterLink
          to="/history"
          class="rounded-xl bg-[#eef2fa] px-3 py-2 text-sm font-semibold text-[#4d5f8f]"
        >
          返回
        </RouterLink>
      </div>

      <p v-if="repositoryError" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        本地数据读取异常，已使用安全空数据展示。
      </p>
    </header>

    <div class="space-y-4 px-5 py-4">
      <section v-if="!detail" class="rounded-2xl border border-dashed border-[#F7CAC9] bg-white/75 p-6 text-center shadow-sm">
        <h2 class="text-base font-bold text-slate-900">未找到该记录</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">该日期没有可展示的有效历史记录。</p>
        <RouterLink
          to="/history"
          class="mt-4 inline-flex rounded-xl bg-[#6E84B7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          返回历史列表
        </RouterLink>
      </section>

      <template v-else>
        <section class="grid grid-cols-3 gap-2 rounded-2xl bg-[#6E84B7] p-3 shadow-lg shadow-[#92A8D1]/40">
          <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <div class="text-xs text-[#eef2fa]">学习</div>
            <div class="mt-1 text-xl font-bold text-white">{{ detail.totals.studyMinutes }}</div>
            <div class="text-xs text-[#e3e9f5]">分钟</div>
          </div>
          <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <div class="text-xs text-[#eef2fa]">做题</div>
            <div class="mt-1 text-xl font-bold text-white">{{ detail.totals.questionCount }}</div>
            <div class="text-xs text-[#e3e9f5]">道</div>
          </div>
          <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <div class="text-xs text-[#eef2fa]">错题</div>
            <div class="mt-1 text-xl font-bold text-white">{{ detail.totals.wrongCount }}</div>
            <div class="text-xs text-[#e3e9f5]">道</div>
          </div>
        </section>

        <section v-if="detail.modules.length" class="space-y-3">
          <article
            v-for="module in detail.modules"
            :key="module.key"
            class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur"
          >
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-[#F7CAC9] ring-4 ring-[#F7CAC9]/25"></span>
              <h2 class="text-base font-bold text-slate-950">{{ module.label }}</h2>
            </div>

            <div class="mt-3 grid grid-cols-4 gap-2">
              <div class="rounded-xl bg-[#eef2fa] p-2.5">
                <div class="text-xs text-[#6E84B7]">学习</div>
                <div class="mt-1 text-base font-bold">{{ module.studyMinutes }}</div>
              </div>
              <div class="rounded-xl bg-[#eef2fa] p-2.5">
                <div class="text-xs text-[#6E84B7]">做题</div>
                <div class="mt-1 text-base font-bold">{{ module.questionCount }}</div>
              </div>
              <div class="rounded-xl bg-[#eef2fa] p-2.5">
                <div class="text-xs text-[#6E84B7]">错题</div>
                <div class="mt-1 text-base font-bold">{{ module.wrongCount }}</div>
              </div>
              <div class="rounded-xl bg-[#eef2fa] p-2.5">
                <div class="text-xs text-[#6E84B7]">正确率</div>
                <div class="mt-1 text-base font-bold">{{ module.correctRateText || '暂无' }}</div>
              </div>
            </div>

            <div v-if="module.wrongReasonTags.length" class="mt-3">
              <div class="text-xs text-slate-500">固定错因</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="tag in module.wrongReasonTags"
                  :key="tag"
                  class="rounded-full bg-[#92A8D1] px-3 py-1.5 text-xs font-medium text-white"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <div v-if="module.customWrongReasons.length" class="mt-3">
              <div class="text-xs text-slate-500">自定义错因</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="reason in module.customWrongReasons"
                  :key="reason"
                  class="rounded-full border border-[#F7CAC9] bg-[#F7CAC9]/35 px-3 py-1.5 text-xs font-medium text-[#72515b]"
                >
                  {{ reason }}
                </span>
              </div>
            </div>

            <p v-if="module.note" class="mt-3 rounded-xl bg-[#f7f9fd] px-3 py-2 text-sm leading-6 text-slate-600">
              {{ module.note }}
            </p>
          </article>
        </section>

        <section v-else class="rounded-2xl bg-white/80 p-4 text-sm text-slate-500 shadow-sm">
          这天没有有效模块，仅记录了收获或明日重点。
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <div>
            <div class="text-sm font-semibold text-slate-700">今日收获</div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ detail.todayGain || '未填写' }}</p>
          </div>
          <div class="mt-4">
            <div class="text-sm font-semibold text-slate-700">明日重点</div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ detail.tomorrowFocus || '未填写' }}</p>
          </div>
        </section>

        <section class="rounded-2xl bg-[#F7CAC9]/30 p-4 text-xs leading-5 text-[#72515b] ring-1 ring-[#F7CAC9]/50">
          <div>创建时间：{{ formatTime(detail.createdAt) || '未知' }}</div>
          <div class="mt-1">最后更新：{{ formatTime(detail.updatedAt) || '未知' }}</div>
        </section>

        <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
          <RouterLink
            :to="editPath"
            class="block w-full rounded-xl bg-[#6E84B7] px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-[#92A8D1]/40 transition active:scale-[0.99]"
          >
            编辑此记录
          </RouterLink>
        </section>
      </template>
    </div>

    <BottomNav />
  </main>
</template>
