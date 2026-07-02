<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import ModuleRecordForm from '../components/ModuleRecordForm.vue'
import ModuleSelector from '../components/ModuleSelector.vue'
import SaveStatus from '../components/SaveStatus.vue'
import { useStudyRecords } from '../composables/useStudyRecords.js'
import { MODULES } from '../domain/constants.js'
import { SAVE_REASON, SAVE_STATUS } from '../domain/saveState.js'
import { getLocalDateKey, isDateKey } from '../utils/date.js'

const route = useRoute()
const router = useRouter()
const initialDate = isDateKey(route.query.date) ? route.query.date : getLocalDateKey()
const {
  draft,
  errors,
  saveStatus,
  lastSavedAt,
  repositoryError,
  hasUnsavedChanges,
  totals,
  loadDate,
  selectModule,
  requestUnselectModule,
  toggleWrongReason,
  save,
  discardPendingAutosave,
} = useStudyRecords(initialDate)

const dateInput = ref(initialDate)
const toastMessage = ref('')
const toastTimer = ref(null)
const allowedRouteDate = ref('')
const revertingRouteDate = ref('')
const isCalendarOpen = ref(false)
const visibleMonth = ref(getMonthStart(initialDate))

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const selectedModuleInfos = computed(() => {
  return draft.selectedModules
    .map((key) => MODULES.find((module) => module.key === key))
    .filter(Boolean)
})

const selectedDateLabel = computed(() => formatDateLabel(dateInput.value))
const visibleMonthLabel = computed(() => {
  const date = visibleMonth.value
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
})

const calendarDays = computed(() => {
  const start = visibleMonth.value
  const firstDay = new Date(start.getFullYear(), start.getMonth(), 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const cursor = new Date(firstDay)
  cursor.setDate(firstDay.getDate() - firstWeekday)

  return Array.from({ length: 42 }, () => {
    const day = new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)
    return {
      key: getLocalDateKey(day),
      label: day.getDate(),
      inMonth: day.getMonth() === start.getMonth(),
      isToday: getLocalDateKey(day) === getLocalDateKey(),
      isSelected: getLocalDateKey(day) === dateInput.value,
    }
  })
})

const vAutoresize = {
  mounted: resizeTextarea,
  updated: resizeTextarea,
}

function resizeTextarea(element) {
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

watch(
  () => route.query.date,
  (date) => {
    const nextDate = isDateKey(date) ? date : getLocalDateKey()
    if (nextDate === draft.date) {
      return
    }

    if (revertingRouteDate.value === nextDate) {
      revertingRouteDate.value = ''
      dateInput.value = nextDate
      visibleMonth.value = getMonthStart(nextDate)
      return
    }

    if (allowedRouteDate.value === nextDate) {
      allowedRouteDate.value = ''
      dateInput.value = nextDate
      visibleMonth.value = getMonthStart(nextDate)
      isCalendarOpen.value = false
      loadDate(nextDate)
      return
    }

    if (!confirmDiscardUnsaved()) {
      revertingRouteDate.value = draft.date
      dateInput.value = draft.date
      router.replace({ path: '/record', query: { date: draft.date } })
      return
    }

    dateInput.value = nextDate
    visibleMonth.value = getMonthStart(nextDate)
    isCalendarOpen.value = false
    loadDate(nextDate)
  },
)

async function changeRecordDate(nextDate) {
  if (!isDateKey(nextDate) || nextDate === draft.date) {
    dateInput.value = draft.date
    return
  }

  if (!confirmDiscardUnsaved()) {
    dateInput.value = draft.date
    return
  }

  allowedRouteDate.value = nextDate
  await router.push({ path: '/record', query: { date: nextDate } })
}

async function selectCalendarDate(nextDate) {
  await changeRecordDate(nextDate)
}

async function selectToday() {
  const today = getLocalDateKey()
  visibleMonth.value = getMonthStart(today)
  await changeRecordDate(today)
}

function shiftVisibleMonth(offset) {
  visibleMonth.value = new Date(
    visibleMonth.value.getFullYear(),
    visibleMonth.value.getMonth() + offset,
    1,
  )
}

function confirmDiscardUnsaved() {
  if (!hasUnsavedChanges.value) {
    return true
  }

  const confirmed = window.confirm('当前存在未保存修改，是否放弃这些修改？')
  if (confirmed) {
    discardPendingAutosave()
  }
  return confirmed
}

function handleManualSave() {
  const result = save({ manual: true })
  if (result.ok) {
    showToast('保存完成')
  } else if (result.reason === SAVE_REASON.INVALID) {
    showToast('请先修正校验问题')
  } else if (result.reason === SAVE_REASON.TRANSIENT_EMPTY_NUMERIC) {
    showToast('请补全数字字段；如果要清零，请输入 0')
  } else if (result.reason === SAVE_REASON.DELETE_CANCELED) {
    showToast('已取消删除')
  } else if (result.reason === SAVE_REASON.SAVE_FAILED) {
    showToast('保存失败，请检查浏览器存储空间或本地数据状态。')
  } else {
    clearToast()
  }
}

function handleModuleSelect(key) {
  selectModule(key)
  clearToast()
}

function handleModuleUnselect(key) {
  requestUnselectModule(key)
  clearToast()
}

function showToast(message) {
  clearToast()
  toastMessage.value = message
  toastTimer.value = window.setTimeout(() => {
    toastMessage.value = ''
    toastTimer.value = null
  }, 1800)
}

function clearToast() {
  if (toastTimer.value) {
    window.clearTimeout(toastTimer.value)
    toastTimer.value = null
  }
  toastMessage.value = ''
}

onBeforeRouteLeave(() => {
  return confirmDiscardUnsaved()
})

function beforeUnload(event) {
  if (!hasUnsavedChanges.value) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

window.addEventListener('beforeunload', beforeUnload)

onBeforeUnmount(() => {
  discardPendingAutosave()
  clearToast()
  window.removeEventListener('beforeunload', beforeUnload)
})

function getMonthStart(dateKey) {
  const [year, month] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function formatDateLabel(dateKey) {
  if (!isDateKey(dateKey)) {
    return dateKey
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  return `${year}年${month}月${day}日`
}
</script>

<template>
  <main class="mx-auto min-h-svh max-w-md overflow-hidden bg-transparent pb-20 text-[#26324a]">
    <header class="sticky top-0 z-10 border-b border-white/70 bg-white/80 px-5 py-4 shadow-sm shadow-[#92A8D1]/20 backdrop-blur-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold tracking-wide text-[#6E84B7]">记录闭环 MVP</p>
          <h1 class="mt-1 text-2xl font-bold text-[#26324a]">公考学习记录</h1>
        </div>
        <SaveStatus :status="saveStatus" :last-saved-at="lastSavedAt" />
      </div>

      <p v-if="saveStatus === SAVE_STATUS.SAVE_FAILED" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        保存失败，请检查浏览器存储空间或本地数据状态。
      </p>
      <p v-else-if="repositoryError" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        本地数据读取异常，已使用安全空数据展示。
      </p>
    </header>

    <div class="space-y-4 px-5 py-4">
      <section class="relative z-20 rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
        <div class="block">
          <span class="text-sm font-medium text-slate-700">记录日期</span>
          <button
            type="button"
            class="mt-2 flex w-full items-center justify-between rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-3 py-2.5 text-left text-base outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
            @click="isCalendarOpen = !isCalendarOpen"
          >
            <span>{{ selectedDateLabel }}</span>
            <span class="rounded-lg bg-[#F7CAC9]/45 px-2 py-1 text-xs font-semibold text-[#72515b]">选择</span>
          </button>
        </div>

        <div
          v-if="isCalendarOpen"
          class="fixed inset-0 z-40 bg-[#26324a]/35 backdrop-blur-[2px]"
          @click="isCalendarOpen = false"
        ></div>

        <div
          v-if="isCalendarOpen"
          class="fixed left-1/2 top-24 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-[#26324a]/20 backdrop-blur-xl"
        >
          <div class="flex items-center justify-between">
            <button
              type="button"
              class="rounded-full bg-[#eef2fa] px-3 py-2 text-sm font-semibold text-[#4d5f8f]"
              @click="shiftVisibleMonth(-1)"
            >
              上月
            </button>
            <div class="font-bold text-[#26324a]">{{ visibleMonthLabel }}</div>
            <button
              type="button"
              class="rounded-full bg-[#eef2fa] px-3 py-2 text-sm font-semibold text-[#4d5f8f]"
              @click="shiftVisibleMonth(1)"
            >
              下月
            </button>
          </div>

          <div class="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
            <span v-for="day in weekDays" :key="day">{{ day }}</span>
          </div>
          <div class="mt-2 grid grid-cols-7 gap-1">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="aspect-square rounded-xl text-sm font-semibold transition active:scale-95"
              :class="[
                day.isSelected
                  ? 'bg-[#6E84B7] text-white shadow-md shadow-[#92A8D1]/40'
                  : day.isToday
                    ? 'bg-[#F7CAC9]/45 text-[#72515b]'
                    : day.inMonth
                      ? 'text-[#26324a] hover:bg-[#eef2fa]'
                      : 'text-slate-300 hover:bg-slate-50',
              ]"
              @click="selectCalendarDate(day.key)"
            >
              {{ day.label }}
            </button>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl bg-[#F7CAC9]/45 px-3 py-2 text-sm font-semibold text-[#72515b]"
              @click="selectToday"
            >
              回到今天
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-[#eef2fa] px-3 py-2 text-sm font-semibold text-[#4d5f8f]"
              @click="isCalendarOpen = false"
            >
              收起
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-3 gap-2 rounded-2xl bg-[#6E84B7] p-3 shadow-lg shadow-[#92A8D1]/40">
        <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
          <div class="text-xs text-[#eef2fa]">学习</div>
          <div class="mt-1 text-xl font-bold text-white">{{ totals.studyMinutes }}</div>
          <div class="text-xs text-[#e3e9f5]">分钟</div>
        </div>
        <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
          <div class="text-xs text-[#eef2fa]">做题</div>
          <div class="mt-1 text-xl font-bold text-white">{{ totals.questionCount }}</div>
          <div class="text-xs text-[#e3e9f5]">道</div>
        </div>
        <div class="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
          <div class="text-xs text-[#eef2fa]">错题</div>
          <div class="mt-1 text-xl font-bold text-white">{{ totals.wrongCount }}</div>
          <div class="text-xs text-[#e3e9f5]">道</div>
        </div>
      </section>

      <ModuleSelector
        :modules="MODULES"
        :selected-modules="draft.selectedModules"
        @select="handleModuleSelect"
        @unselect="handleModuleUnselect"
      />

      <div v-if="selectedModuleInfos.length" class="space-y-3">
        <ModuleRecordForm
          v-for="moduleInfo in selectedModuleInfos"
          :key="moduleInfo.key"
          :module-info="moduleInfo"
          :model-value="draft.modules[moduleInfo.key]"
          :errors="errors[moduleInfo.key]"
          @toggle-reason="toggleWrongReason(moduleInfo.key, $event)"
        />
      </div>
      <section v-else class="rounded-2xl border border-dashed border-[#F7CAC9] bg-white/70 p-5 text-center text-sm text-slate-500 shadow-sm">
        先选择今天学习过的模块。未选择模块不会创建数据。
      </section>

      <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">今日收获</span>
          <textarea
            v-autoresize
            v-model="draft.todayGain"
            rows="3"
            style="overflow: hidden"
            class="mt-2 w-full resize-none rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
            placeholder="今天最有价值的一点是什么？"
          />
        </label>

        <label class="mt-4 block">
          <span class="text-sm font-medium text-slate-700">明日重点</span>
          <textarea
            v-autoresize
            v-model="draft.tomorrowFocus"
            rows="3"
            style="overflow: hidden"
            class="mt-2 w-full resize-none rounded-xl border border-[#dbe3f2] bg-[#f7f9fd] px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#92A8D1] focus:bg-white focus:ring-4 focus:ring-[#92A8D1]/20"
            placeholder="明天最应该训练什么？"
          />
        </label>
      </section>

      <section class="rounded-2xl bg-[#F7CAC9]/35 p-4 text-xs leading-5 text-[#72515b] ring-1 ring-[#F7CAC9]/50">
        数据仅保存在当前设备。第一阶段先完成记录闭环，JSON 导出、历史、统计和 PWA 会在后续阶段实现。
      </section>

      <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
        <button
          type="button"
          class="w-full rounded-xl bg-[#6E84B7] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-[#92A8D1]/40 transition hover:bg-[#6078ad] active:scale-[0.99]"
          @click="handleManualSave"
        >
          保存记录
        </button>
      </section>
    </div>

    <div
      v-if="toastMessage"
      class="fixed left-1/2 top-24 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-[#26324a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20"
    >
      {{ toastMessage }}
    </div>

    <BottomNav v-if="!isCalendarOpen" />
  </main>
</template>
