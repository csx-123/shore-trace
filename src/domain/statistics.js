import { MODULES, WRONG_REASON_TAGS } from './constants.js'
import { isDateKey } from '../utils/date.js'

const moduleInfoByKey = new Map(MODULES.map((module) => [module.key, module]))
const wrongReasonOrder = new Map(WRONG_REASON_TAGS.map((tag, index) => [tag, index]))
const MIN_ACCURACY_SAMPLE = 5
const MIN_WRONG_REASON_COUNT = 2

function toNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isEffectiveModuleRecord(module) {
  if (!module || typeof module !== 'object' || Array.isArray(module)) {
    return false
  }

  return (
    toNonNegativeInteger(module.studyMinutes) > 0 ||
    toNonNegativeInteger(module.questionCount) > 0 ||
    toNonNegativeInteger(module.wrongCount) > 0 ||
    (Array.isArray(module.wrongReasonTags) && module.wrongReasonTags.length > 0) ||
    (Array.isArray(module.customWrongReasons) && module.customWrongReasons.length > 0) ||
    normalizeString(module.note) !== ''
  )
}

export function getCorrectRate(questionCount, wrongCount) {
  const questions = toNonNegativeInteger(questionCount)
  const wrong = toNonNegativeInteger(wrongCount)
  const effectiveWrong = Math.min(wrong, questions)
  const correctCount = Math.max(questions - effectiveWrong, 0)

  if (questions === 0) {
    return {
      questionCount: questions,
      wrongCount: effectiveWrong,
      correctCount,
      rate: null,
    }
  }

  return {
    questionCount: questions,
    wrongCount: effectiveWrong,
    correctCount,
    rate: correctCount / questions,
  }
}

export function formatCorrectRate(value) {
  const correctRate = typeof value === 'object' && value !== null
    ? value
    : getCorrectRate(arguments[0], arguments[1])

  if (correctRate.rate === null) {
    return ''
  }

  const rate = correctRate.rate * 100
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`
}

export function getCorrectRateText(questionCount, wrongCount) {
  return formatCorrectRate(getCorrectRate(questionCount, wrongCount))
}

export function getRecordEditPath(date) {
  return `/record?date=${encodeURIComponent(date)}`
}

export function getEffectiveModuleDetails(record) {
  if (!record?.modules || typeof record.modules !== 'object' || Array.isArray(record.modules)) {
    return []
  }

  return Object.entries(record.modules)
    .filter(([key, module]) => moduleInfoByKey.has(key) && isEffectiveModuleRecord(module))
    .map(([key, module]) => {
      const studyMinutes = toNonNegativeInteger(module.studyMinutes)
      const questionCount = toNonNegativeInteger(module.questionCount)
      const wrongCount = Math.min(toNonNegativeInteger(module.wrongCount), questionCount)

      return {
        key,
        label: moduleInfoByKey.get(key).label,
        studyMinutes,
        questionCount,
        wrongCount,
        correctRate: getCorrectRate(questionCount, wrongCount),
        correctRateText: getCorrectRateText(questionCount, wrongCount),
        wrongReasonTags: Array.isArray(module.wrongReasonTags) ? module.wrongReasonTags : [],
        customWrongReasons: Array.isArray(module.customWrongReasons) ? module.customWrongReasons : [],
        note: typeof module.note === 'string' ? module.note : '',
      }
    })
}

export function summarizeRecord(record) {
  if (!record || typeof record !== 'object' || !isDateKey(record.date)) {
    return null
  }

  const modules = getEffectiveModuleDetails(record)
  const todayGain = typeof record.todayGain === 'string' ? record.todayGain : ''
  const tomorrowFocus = typeof record.tomorrowFocus === 'string' ? record.tomorrowFocus : ''
  const hasContent =
    modules.length > 0 || normalizeString(todayGain) !== '' || normalizeString(tomorrowFocus) !== ''

  if (!hasContent) {
    return null
  }

  const totals = modules.reduce(
    (sum, module) => {
      sum.studyMinutes += module.studyMinutes
      sum.questionCount += module.questionCount
      sum.wrongCount += module.wrongCount
      return sum
    },
    { studyMinutes: 0, questionCount: 0, wrongCount: 0 },
  )

  return {
    date: record.date,
    totals,
    modules,
    moduleLabels: modules.map((module) => module.label),
    todayGain,
    tomorrowFocus,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  }
}

export function createHistorySummaries(records) {
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return []
  }

  return Object.values(records)
    .map((record) => summarizeRecord(record))
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function getHistoryDetail(records, date) {
  if (!isDateKey(date) || !records || typeof records !== 'object' || Array.isArray(records)) {
    return null
  }

  return summarizeRecord(records[date])
}

export function getTomorrowFocusSummary(value, maxLength = 36) {
  const text = normalizeString(value)
  if (!text) {
    return ''
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function createStatisticsSummary(records, referenceDateKey) {
  const summaries = createHistorySummaries(records)
  const effectiveReferenceDateKey = isDateKey(referenceDateKey) ? referenceDateKey : formatDateKey(new Date())
  const weekRange = getWeekRange(effectiveReferenceDateKey)
  const weekDataEnd = effectiveReferenceDateKey < weekRange.end ? effectiveReferenceDateKey : weekRange.end
  const totalModuleStatsByKey = createEmptyModuleStatsMap()
  const weekModuleStatsByKey = createEmptyModuleStatsMap()
  const totalWrongReasonCounts = new Map()
  const weekWrongReasonCounts = new Map()
  let totalStudyMinutes = 0
  let totalQuestionCount = 0
  let totalWrongCount = 0
  let weekStudyMinutes = 0
  const weekStudyDates = new Set()

  for (const summary of summaries) {
    const inCurrentWeek = isDateInRange(summary.date, weekRange.start, weekDataEnd)

    if (inCurrentWeek) {
      weekStudyDates.add(summary.date)
      weekStudyMinutes += summary.totals.studyMinutes
    }

    totalStudyMinutes += summary.totals.studyMinutes
    totalQuestionCount += summary.totals.questionCount
    totalWrongCount += summary.totals.wrongCount

    for (const module of summary.modules) {
      addModuleStats(totalModuleStatsByKey, module, true)
      if (inCurrentWeek) {
        addModuleStats(weekModuleStatsByKey, module, true)
      }

      for (const tag of module.wrongReasonTags) {
        if (wrongReasonOrder.has(tag)) {
          totalWrongReasonCounts.set(tag, (totalWrongReasonCounts.get(tag) || 0) + 1)
          if (inCurrentWeek) {
            weekWrongReasonCounts.set(tag, (weekWrongReasonCounts.get(tag) || 0) + 1)
          }
        }
      }
    }
  }

  const totalModuleStats = finalizeModuleStats(totalModuleStatsByKey)
  const weekModuleStats = finalizeModuleStats(weekModuleStatsByKey)
  const totalCorrectRate = getCorrectRate(totalQuestionCount, totalWrongCount)
  const weekWrongReasonRanking = createWrongReasonRanking(weekWrongReasonCounts)
  const weekHighFrequencyWrongReasons = weekWrongReasonRanking.filter(
    (reason) => reason.count >= MIN_WRONG_REASON_COUNT,
  )
  const weekObservations = createWeekObservations(weekModuleStats, weekHighFrequencyWrongReasons)

  return {
    totalStudyDays: summaries.length,
    totalStudyMinutes,
    totalQuestionCount,
    totalWrongCount,
    totalCorrectRate,
    totalCorrectRateText: formatCorrectRate(totalCorrectRate),
    weekStudyDays: weekStudyDates.size,
    weekStudyMinutes,
    weekRange,
    allTime: {
      studyDays: summaries.length,
      studyMinutes: totalStudyMinutes,
      questionCount: totalQuestionCount,
      wrongCount: totalWrongCount,
      correctRate: totalCorrectRate,
      moduleStats: totalModuleStats,
      wrongReasonRanking: createWrongReasonRanking(totalWrongReasonCounts),
    },
    currentWeek: {
      studyDays: weekStudyDates.size,
      studyMinutes: weekStudyMinutes,
      range: weekRange,
      moduleStats: weekModuleStats,
      wrongReasonRanking: weekWrongReasonRanking,
      highFrequencyWrongReasons: weekHighFrequencyWrongReasons,
      observations: weekObservations,
    },
    moduleStats: totalModuleStats,
    wrongReasonRanking: createWrongReasonRanking(totalWrongReasonCounts),
  }
}

function createEmptyModuleStatsMap() {
  return new Map(
    MODULES.map((module) => [
      module.key,
      {
        key: module.key,
        label: module.label,
        studyMinutes: 0,
        questionCount: 0,
        wrongCount: 0,
        hasRecord: false,
      },
    ]),
  )
}

function addModuleStats(moduleStatsByKey, module, hasRecord) {
  const moduleStats = moduleStatsByKey.get(module.key)
  if (!moduleStats) {
    return
  }

  moduleStats.studyMinutes += module.studyMinutes
  moduleStats.questionCount += module.questionCount
  moduleStats.wrongCount += module.wrongCount
  moduleStats.hasRecord = moduleStats.hasRecord || hasRecord
}

function finalizeModuleStats(moduleStatsByKey) {
  return Array.from(moduleStatsByKey.values()).map((module) => {
    const correctRate = getCorrectRate(module.questionCount, module.wrongCount)
    return {
      ...module,
      correctRate,
      correctRateText: formatCorrectRate(correctRate),
    }
  })
}

function createWrongReasonRanking(wrongReasonCounts) {
  return Array.from(wrongReasonCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }
      return wrongReasonOrder.get(left.tag) - wrongReasonOrder.get(right.tag)
    })
}

function createWeekObservations(weekModuleStats, highFrequencyWrongReasons) {
  const observations = []
  const comparableModules = weekModuleStats.filter((module) => module.questionCount >= MIN_ACCURACY_SAMPLE)

  if (comparableModules.length > 0) {
    const lowestAccuracyModule = comparableModules.reduce((lowest, module) => {
      if (module.correctRate.rate < lowest.correctRate.rate) {
        return module
      }
      if (module.correctRate.rate === lowest.correctRate.rate && module.questionCount > lowest.questionCount) {
        return module
      }
      return lowest
    }, comparableModules[0])

    observations.push({
      type: 'lowestAccuracyModule',
      moduleKey: lowestAccuracyModule.key,
      moduleLabel: lowestAccuracyModule.label,
      questionCount: lowestAccuracyModule.questionCount,
      correctRate: lowestAccuracyModule.correctRate,
    })
  }

  if (highFrequencyWrongReasons.length > 0 && observations.length < 3) {
    const topReason = highFrequencyWrongReasons[0]
    observations.push({
      type: 'highFrequencyWrongReason',
      tag: topReason.tag,
      count: topReason.count,
    })
  }

  if (observations.length < 3) {
    const unrecordedModule = weekModuleStats.find((module) => !module.hasRecord)
    if (unrecordedModule) {
      observations.push({
        type: 'unrecordedModule',
        moduleKey: unrecordedModule.key,
        moduleLabel: unrecordedModule.label,
      })
    }
  }

  return observations.slice(0, 3)
}

function getWeekRange(referenceDateKey) {
  const referenceDate = parseDateKey(referenceDateKey)
  const weekStart = new Date(referenceDate)
  const weekday = (weekStart.getDay() + 6) % 7
  weekStart.setDate(weekStart.getDate() - weekday)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return {
    start: formatDateKey(weekStart),
    end: formatDateKey(weekEnd),
  }
}

function isDateInRange(dateKey, startDateKey, endDateKey) {
  return isDateKey(dateKey) && dateKey >= startDateKey && dateKey <= endDateKey
}

function parseDateKey(dateKey) {
  if (!isDateKey(dateKey)) {
    return null
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
