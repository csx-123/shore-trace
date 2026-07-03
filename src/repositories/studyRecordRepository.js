import { APP_DATA_VERSION, MODULES, STORAGE_KEY, WRONG_REASON_TAGS } from '../domain/constants.js'
import { isDateKey } from '../utils/date.js'

const moduleKeys = new Set(MODULES.map((module) => module.key))
const wrongReasonSet = new Set(WRONG_REASON_TAGS)

function emptyData() {
  return { version: APP_DATA_VERSION, records: {} }
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
        return { record: null, error: new Error('存在未知模块 key') }
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
    return { data: emptyData(), error: new Error('本地数据结构异常') }
  }

  if (value.version !== APP_DATA_VERSION || !value.records || typeof value.records !== 'object') {
    return { data: emptyData(), error: new Error('本地数据版本或结构异常') }
  }

  const records = {}
  for (const [date, recordValue] of Object.entries(value.records)) {
    if (!isDateKey(date)) {
      continue
    }

    const recordResult = sanitizeRecord(recordValue, date)
    if (recordResult.error) {
      return { data: emptyData(), error: recordResult.error }
    }
    if (recordResult.record) {
      records[date] = recordResult.record
    }
  }

  return { data: { version: APP_DATA_VERSION, records }, error: null }
}

function readData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { data: emptyData(), error: null }
    }

    return sanitizeData(JSON.parse(raw))
  } catch (error) {
    return { data: emptyData(), error }
  }
}

function writeData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

    return { data: result.data, error: null }
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

      const data = result.data
      data.records[record.date] = record
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

      const data = result.data
      delete data.records[date]
      writeData(data)
      return { ok: true, error: null }
    } catch (error) {
      return { ok: false, error }
    }
  },
}
