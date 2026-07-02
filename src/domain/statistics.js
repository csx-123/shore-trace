import { MODULES } from './constants.js'
import { isDateKey } from '../utils/date.js'

const moduleInfoByKey = new Map(MODULES.map((module) => [module.key, module]))

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

export function getCorrectRateText(questionCount, wrongCount) {
  const questions = toNonNegativeInteger(questionCount)
  const wrong = toNonNegativeInteger(wrongCount)
  if (questions === 0) {
    return ''
  }

  const correctCount = Math.max(questions - wrong, 0)
  const rate = (correctCount / questions) * 100
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`
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
