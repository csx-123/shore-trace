import { MODULES, WRONG_REASON_TAGS } from './constants.js'
import { isDateKey } from '../utils/date.js'

const moduleKeys = new Set(MODULES.map((module) => module.key))
const wrongReasonSet = new Set(WRONG_REASON_TAGS)

export function createEmptyModuleDraft() {
  return {
    studyMinutes: '',
    questionCount: '',
    wrongCount: '',
    wrongReasonTags: [],
    customWrongReasons: [],
    note: '',
  }
}

export function createEmptyRecordDraft(date) {
  return {
    date,
    selectedModules: [],
    modules: {},
    todayGain: '',
    tomorrowFocus: '',
  }
}

export function createDraftFromRecord(record, date) {
  const draft = createEmptyRecordDraft(date)

  if (!record) {
    return draft
  }

  draft.todayGain = record.todayGain || ''
  draft.tomorrowFocus = record.tomorrowFocus || ''
  draft.selectedModules = Object.keys(record.modules || {}).filter((key) => moduleKeys.has(key))

  for (const key of draft.selectedModules) {
    const module = record.modules[key]
    draft.modules[key] = {
      studyMinutes: String(module?.studyMinutes ?? ''),
      questionCount: String(module?.questionCount ?? ''),
      wrongCount: String(module?.wrongCount ?? ''),
      wrongReasonTags: Array.isArray(module?.wrongReasonTags)
        ? module.wrongReasonTags.filter((tag) => wrongReasonSet.has(tag))
        : [],
      customWrongReasons: Array.isArray(module?.customWrongReasons)
        ? normalizeCustomWrongReasons(module.customWrongReasons)
        : [],
      note: module?.note || '',
    }
  }

  return draft
}

function parseIntegerField(value) {
  if (value === '' || value === null || value === undefined) {
    return { value: 0, empty: true }
  }

  const text = String(value).trim()
  if (text === '') {
    return { value: 0, empty: true }
  }

  if (!/^\d+$/.test(text)) {
    return { value: 0, error: '请输入非负整数' }
  }

  return { value: Number(text), empty: false }
}

export function isModuleDraftEmpty(moduleDraft, previousModule = null) {
  if (!moduleDraft) {
    return true
  }

  const studyMinutes = parseIntegerField(moduleDraft.studyMinutes)
  const questionCount = parseIntegerField(moduleDraft.questionCount)
  const wrongCount = parseIntegerField(moduleDraft.wrongCount)

  if (studyMinutes.error || questionCount.error || wrongCount.error) {
    return false
  }

  if (
    previousModule &&
    (studyMinutes.empty || questionCount.empty || wrongCount.empty) &&
    (previousModule.studyMinutes > 0 || previousModule.questionCount > 0 || previousModule.wrongCount > 0)
  ) {
    return false
  }

  return (
    (studyMinutes.value || 0) === 0 &&
    (questionCount.value || 0) === 0 &&
    (wrongCount.value || 0) === 0 &&
    (!Array.isArray(moduleDraft.wrongReasonTags) || moduleDraft.wrongReasonTags.length === 0) &&
    (!Array.isArray(moduleDraft.customWrongReasons) || moduleDraft.customWrongReasons.length === 0) &&
    !String(moduleDraft.note || '').trim()
  )
}

export function normalizeDraftToRecord(draft, previousRecord = null) {
  const errors = {}
  const modules = {}

  if (!isDateKey(draft.date)) {
    errors.date = '日期格式无效'
  }

  for (const key of draft.selectedModules || []) {
    if (!moduleKeys.has(key)) {
      continue
    }

    const moduleDraft = draft.modules[key] || createEmptyModuleDraft()
    const previousModule = previousRecord?.modules?.[key] || null
    if (isModuleDraftEmpty(moduleDraft, previousModule)) {
      continue
    }

    const moduleErrors = {}
    const studyMinutes = parseIntegerField(moduleDraft.studyMinutes)
    const questionCount = parseIntegerField(moduleDraft.questionCount)
    const wrongCount = parseIntegerField(moduleDraft.wrongCount)

    if (studyMinutes.error) {
      moduleErrors.studyMinutes = studyMinutes.error
    }
    if (questionCount.error) {
      moduleErrors.questionCount = questionCount.error
    }
    if (wrongCount.error) {
      moduleErrors.wrongCount = wrongCount.error
    }

    const effectiveStudyMinutes =
      studyMinutes.empty && previousModule ? previousModule.studyMinutes : studyMinutes.value
    const effectiveQuestionCount =
      questionCount.empty && previousModule ? previousModule.questionCount : questionCount.value
    const effectiveWrongCount =
      wrongCount.empty && previousModule ? previousModule.wrongCount : wrongCount.value

    if (!questionCount.error && !wrongCount.error && effectiveWrongCount > effectiveQuestionCount) {
      moduleErrors.wrongCount = '错题数不能大于做题数'
    }
    if (!questionCount.error && !wrongCount.error && effectiveQuestionCount === 0 && effectiveWrongCount > 0) {
      moduleErrors.wrongCount = '做题数为 0 时，错题数必须为 0'
    }

    const wrongReasonTags = Array.isArray(moduleDraft.wrongReasonTags)
      ? moduleDraft.wrongReasonTags.filter((tag) => wrongReasonSet.has(tag))
      : []
    const customWrongReasons = Array.isArray(moduleDraft.customWrongReasons)
      ? normalizeCustomWrongReasons(moduleDraft.customWrongReasons)
      : []

    if (Object.keys(moduleErrors).length > 0) {
      errors[key] = moduleErrors
      continue
    }

    modules[key] = {
      studyMinutes: effectiveStudyMinutes,
      questionCount: effectiveQuestionCount,
      wrongCount: effectiveWrongCount,
      wrongReasonTags,
      customWrongReasons,
      note: String(moduleDraft.note || '').trim(),
    }
  }

  const hasActualContent =
    Object.keys(modules).length > 0 ||
    Boolean(String(draft.todayGain || '').trim()) ||
    Boolean(String(draft.tomorrowFocus || '').trim())

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, hasActualContent }
  }

  if (!hasActualContent) {
    return { ok: true, empty: true, record: null, errors: {} }
  }

  const now = new Date().toISOString()
  return {
    ok: true,
    empty: false,
    errors: {},
    record: {
      date: draft.date,
      modules,
      todayGain: String(draft.todayGain || '').trim(),
      tomorrowFocus: String(draft.tomorrowFocus || '').trim(),
      createdAt: previousRecord?.createdAt || now,
      updatedAt: now,
    },
  }
}

function normalizeCustomWrongReasons(reasons) {
  return [...new Set(
    reasons
      .map((reason) => String(reason || '').trim())
      .filter(Boolean),
  )]
}

export function hasDraftContent(draft) {
  if (!draft) {
    return false
  }

  return (
    Boolean(String(draft.todayGain || '').trim()) ||
    Boolean(String(draft.tomorrowFocus || '').trim()) ||
    (draft.selectedModules || []).some((key) => !isModuleDraftEmpty(draft.modules[key]))
  )
}
