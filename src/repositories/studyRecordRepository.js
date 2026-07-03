import { APP_DATA_VERSION, MODULES, STORAGE_KEY, WRONG_REASON_TAGS } from '../domain/constants.js'
import { isDateKey } from '../utils/date.js'

const moduleKeys = new Set(MODULES.map((module) => module.key))
const wrongReasonSet = new Set(WRONG_REASON_TAGS)

function emptyData() {
  return { version: APP_DATA_VERSION, records: {} }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function sanitizeModule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { module: null, error: new Error('模块数据结构异常') }
  }

  const studyMinutes = Number.isInteger(value.studyMinutes) && value.studyMinutes >= 0 ? value.studyMinutes : 0
  const questionCount = Number.isInteger(value.questionCount) && value.questionCount >= 0 ? value.questionCount : 0
  const wrongCount = Number.isInteger(value.wrongCount) && value.wrongCount >= 0 ? value.wrongCount : 0

  if (wrongCount > questionCount || (questionCount === 0 && wrongCount > 0)) {
    return { module: null, error: new Error('模块题数数据异常') }
  }

  const wrongReasonTags = Array.isArray(value.wrongReasonTags)
    ? value.wrongReasonTags.filter((tag) => wrongReasonSet.has(tag))
    : []
  const customWrongReasons = Array.isArray(value.customWrongReasons)
    ? [...new Set(value.customWrongReasons.map((reason) => String(reason || '').trim()).filter(Boolean))]
    : []
  const note = typeof value.note === 'string' ? value.note : ''

  const isEmpty =
    studyMinutes === 0 &&
    questionCount === 0 &&
    wrongCount === 0 &&
    wrongReasonTags.length === 0 &&
    customWrongReasons.length === 0 &&
    note.trim() === ''

  if (isEmpty) {
    return { module: null, empty: true, error: null }
  }

  return { module: { studyMinutes, questionCount, wrongCount, wrongReasonTags, customWrongReasons, note }, error: null }
}

function sanitizeRecord(value, fallbackDate) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { record: null, error: new Error('记录数据结构异常') }
  }

  const date = isDateKey(value.date) ? value.date : fallbackDate
  if (!isDateKey(date)) {
    return { record: null, error: new Error('记录日期异常') }
  }

  const modules = {}
  if (value.modules && typeof value.modules === 'object' && !Array.isArray(value.modules)) {
    for (const [key, moduleValue] of Object.entries(value.modules)) {
      if (!moduleKeys.has(key)) {
        continue
      }

      const moduleResult = sanitizeModule(moduleValue)
      if (moduleResult.error) {
        return { record: null, error: moduleResult.error }
      }
      if (moduleResult.module) {
        modules[key] = moduleResult.module
      }
    }
  } else if (value.modules !== undefined) {
    return { record: null, error: new Error('记录 modules 结构异常') }
  }

  const todayGain = typeof value.todayGain === 'string' ? value.todayGain : ''
  const tomorrowFocus = typeof value.tomorrowFocus === 'string' ? value.tomorrowFocus : ''
  const hasActualContent =
    Object.keys(modules).length > 0 || todayGain.trim() !== '' || tomorrowFocus.trim() !== ''

  if (!hasActualContent) {
    return { record: null, empty: true, error: null }
  }

  return {
    record: {
      date,
      modules,
      todayGain,
      tomorrowFocus,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    },
    error: null,
  }
}

function sanitizeData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { data: emptyData(), rawData: null, error: new Error('本地数据结构异常') }
  }

  if (
    value.version !== APP_DATA_VERSION ||
    !value.records ||
    typeof value.records !== 'object' ||
    Array.isArray(value.records)
  ) {
    return { data: emptyData(), rawData: null, error: new Error('本地数据版本或结构异常') }
  }

  const records = {}
  for (const [date, recordValue] of Object.entries(value.records)) {
    if (!isDateKey(date)) {
      continue
    }

    const recordResult = sanitizeRecord(recordValue, date)
    if (recordResult.error) {
      return { data: emptyData(), rawData: null, error: recordResult.error }
    }
    if (recordResult.record) {
      records[date] = recordResult.record
    }
  }

  return { data: { version: APP_DATA_VERSION, records }, rawData: value, error: null }
}

function readData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const data = emptyData()
      return { data, rawData: cloneJson(data), error: null }
    }

    return sanitizeData(JSON.parse(raw))
  } catch (error) {
    return { data: emptyData(), rawData: null, error }
  }
}

function writeData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function mergeRecordIntoRawData(rawData, record) {
  const nextData = cloneJson(rawData || emptyData())
  if (!nextData.records || typeof nextData.records !== 'object' || Array.isArray(nextData.records)) {
    nextData.records = {}
  }

  const existingRecord =
    nextData.records[record.date] &&
    typeof nextData.records[record.date] === 'object' &&
    !Array.isArray(nextData.records[record.date])
      ? nextData.records[record.date]
      : {}
  const existingModules =
    existingRecord.modules && typeof existingRecord.modules === 'object' && !Array.isArray(existingRecord.modules)
      ? existingRecord.modules
      : {}
  const mergedModules = {}

  for (const [key, moduleValue] of Object.entries(existingModules)) {
    if (!moduleKeys.has(key)) {
      mergedModules[key] = moduleValue
    }
  }
  for (const [key, moduleValue] of Object.entries(record.modules || {})) {
    if (moduleKeys.has(key)) {
      const existingModule =
        existingModules[key] && typeof existingModules[key] === 'object' && !Array.isArray(existingModules[key])
          ? existingModules[key]
          : {}
      mergedModules[key] = {
        ...existingModule,
        ...moduleValue,
      }
    }
  }

  nextData.version = APP_DATA_VERSION
  nextData.records[record.date] = {
    ...existingRecord,
    date: record.date,
    modules: mergedModules,
    todayGain: record.todayGain,
    tomorrowFocus: record.tomorrowFocus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }

  return nextData
}

export const studyRecordRepository = {
  getAll() {
    return readData()
  },

  exportData() {
    const result = readData()
    if (result.error) {
      return { data: null, error: result.error }
    }

    return { data: cloneJson(result.rawData || result.data), error: null }
  },

  getByDate(date) {
    const result = readData()
    return {
      record: result.data.records[date] || null,
      error: result.error,
    }
  },

  save(record) {
    try {
      const result = readData()
      if (result.error) {
        return { ok: false, record: null, error: result.error }
      }

      const data = mergeRecordIntoRawData(result.rawData, record)
      writeData(data)
      return { ok: true, record, error: null }
    } catch (error) {
      return { ok: false, record: null, error }
    }
  },

  remove(date) {
    try {
      const result = readData()
      if (result.error) {
        return { ok: false, error: result.error }
      }

      const data = cloneJson(result.rawData || result.data)
      delete data.records[date]
      writeData(data)
      return { ok: true, error: null }
    } catch (error) {
      return { ok: false, error }
    }
  },
}
