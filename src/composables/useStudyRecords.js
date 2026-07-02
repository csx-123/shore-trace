import { computed, reactive, ref, watch } from 'vue'
import { studyRecordRepository } from '../repositories/studyRecordRepository.js'
import {
  createDraftFromRecord,
  createEmptyModuleDraft,
  createEmptyRecordDraft,
  normalizeDraftToRecord,
} from '../domain/validators.js'
import { SAVE_REASON, SAVE_STATUS } from '../domain/saveState.js'

const AUTOSAVE_DELAY = 700

export function useStudyRecords(initialDate) {
  const activeDate = ref(initialDate)
  const draft = reactive(createEmptyRecordDraft(initialDate))
  const lastSavedRecord = ref(null)
  const errors = ref({})
  const saveStatus = ref(SAVE_STATUS.SAVED)
  const lastSavedAt = ref('')
  const repositoryError = ref(null)
  const autosaveTimer = ref(null)
  const suppressAutosave = ref(false)

  const hasUnsavedChanges = computed(() => {
    if (hasTransientEmptyNumericFields(draft, lastSavedRecord.value)) {
      return true
    }

    const normalized = normalizeDraftToRecord(draft, lastSavedRecord.value)
    if (!normalized.ok) {
      return true
    }

    const current = normalized.empty ? null : normalized.record
    return JSON.stringify(stripUpdatedAt(current)) !== JSON.stringify(stripUpdatedAt(lastSavedRecord.value))
  })

  const totals = computed(() => {
    return Object.values(draft.modules).reduce(
      (sum, moduleDraft) => {
        if (!moduleDraft) {
          return sum
        }

        sum.studyMinutes += toPositiveInteger(moduleDraft.studyMinutes)
        sum.questionCount += toPositiveInteger(moduleDraft.questionCount)
        sum.wrongCount += toPositiveInteger(moduleDraft.wrongCount)
        return sum
      },
      { studyMinutes: 0, questionCount: 0, wrongCount: 0 },
    )
  })

  function loadDate(date) {
    clearAutosave()
    suppressAutosave.value = true
    activeDate.value = date
    const result = studyRecordRepository.getByDate(date)
    repositoryError.value = result.error
    lastSavedRecord.value = result.record
    Object.assign(draft, createDraftFromRecord(result.record, date))
    errors.value = {}
    saveStatus.value = result.error ? SAVE_STATUS.SAVE_FAILED : SAVE_STATUS.SAVED
    lastSavedAt.value = result.record?.updatedAt || ''
    window.setTimeout(() => {
      suppressAutosave.value = false
    }, 0)
  }

  function ensureModuleDraft(key) {
    if (!draft.modules[key]) {
      draft.modules[key] = createEmptyModuleDraft()
    }
  }

  function selectModule(key) {
    if (!draft.selectedModules.includes(key)) {
      draft.selectedModules.push(key)
    }
    ensureModuleDraft(key)
  }

  function requestUnselectModule(key) {
    const moduleDraft = draft.modules[key]
    const hasContent =
      moduleDraft &&
      (String(moduleDraft.studyMinutes || '').trim() !== '' ||
        String(moduleDraft.questionCount || '').trim() !== '' ||
        String(moduleDraft.wrongCount || '').trim() !== '' ||
        moduleDraft.wrongReasonTags.length > 0 ||
        moduleDraft.customWrongReasons.length > 0 ||
        moduleDraft.note.trim() !== '')

    if (hasContent && !window.confirm('取消该模块会清除已填写内容，确定继续吗？')) {
      return
    }

    draft.selectedModules = draft.selectedModules.filter((item) => item !== key)
    delete draft.modules[key]
  }

  function toggleWrongReason(key, tag) {
    ensureModuleDraft(key)
    const tags = draft.modules[key].wrongReasonTags
    const index = tags.indexOf(tag)
    if (index >= 0) {
      tags.splice(index, 1)
    } else {
      tags.push(tag)
    }
  }

  function save({ manual = false } = {}) {
    clearAutosave()

    const transientEmptyNumericErrors = getTransientEmptyNumericErrors(draft, lastSavedRecord.value)
    if (Object.keys(transientEmptyNumericErrors).length > 0) {
      errors.value = transientEmptyNumericErrors
      saveStatus.value = manual ? SAVE_STATUS.INVALID : SAVE_STATUS.DIRTY
      return { ok: false, reason: SAVE_REASON.TRANSIENT_EMPTY_NUMERIC }
    }

    const normalized = normalizeDraftToRecord(draft, lastSavedRecord.value)
    errors.value = normalized.errors || {}

    if (!normalized.ok) {
      saveStatus.value = SAVE_STATUS.INVALID
      return { ok: false, reason: SAVE_REASON.INVALID }
    }

    if (normalized.empty) {
      if (lastSavedRecord.value) {
        if (!manual) {
          saveStatus.value = SAVE_STATUS.DIRTY
          return { ok: false, reason: SAVE_REASON.NEEDS_MANUAL_DELETE }
        }

        if (!window.confirm('当前日期记录已被清空，是否删除这条记录？')) {
          saveStatus.value = SAVE_STATUS.DIRTY
          return { ok: false, reason: SAVE_REASON.DELETE_CANCELED }
        }

        const removeResult = studyRecordRepository.remove(activeDate.value)
        if (!removeResult.ok) {
          saveStatus.value = SAVE_STATUS.SAVE_FAILED
          repositoryError.value = removeResult.error
          return { ok: false, reason: SAVE_REASON.SAVE_FAILED }
        }
      }

      lastSavedRecord.value = null
      lastSavedAt.value = new Date().toISOString()
      saveStatus.value = SAVE_STATUS.SAVED
      return { ok: true }
    }

    const saveResult = studyRecordRepository.save(normalized.record)
    if (!saveResult.ok) {
      saveStatus.value = SAVE_STATUS.SAVE_FAILED
      repositoryError.value = saveResult.error
      return { ok: false, reason: SAVE_REASON.SAVE_FAILED }
    }

    lastSavedRecord.value = saveResult.record
    lastSavedAt.value = saveResult.record.updatedAt
    saveStatus.value = SAVE_STATUS.SAVED
    repositoryError.value = null
    return { ok: true }
  }

  function scheduleAutosave() {
    if (suppressAutosave.value) {
      return
    }

    clearAutosave()
    saveStatus.value = SAVE_STATUS.DIRTY
    autosaveTimer.value = window.setTimeout(() => {
      saveStatus.value = SAVE_STATUS.EDITING
      save({ manual: false })
    }, AUTOSAVE_DELAY)
  }

  function clearAutosave() {
    if (autosaveTimer.value) {
      window.clearTimeout(autosaveTimer.value)
      autosaveTimer.value = null
    }
  }

  function discardPendingAutosave() {
    clearAutosave()
  }

  function stripUpdatedAt(record) {
    if (!record) {
      return null
    }

    return {
      date: record.date,
      modules: record.modules,
      todayGain: record.todayGain,
      tomorrowFocus: record.tomorrowFocus,
      createdAt: record.createdAt,
    }
  }

  watch(
    draft,
    () => {
      scheduleAutosave()
    },
    { deep: true },
  )

  loadDate(initialDate)

  return {
    activeDate,
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
  }
}

function toPositiveInteger(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }

  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : 0
}

function hasTransientEmptyNumericFields(draft, lastSavedRecord) {
  return Object.keys(getTransientEmptyNumericErrors(draft, lastSavedRecord)).length > 0
}

function getTransientEmptyNumericErrors(draft, lastSavedRecord) {
  if (!lastSavedRecord) {
    return {}
  }

  const result = {}
  for (const key of draft.selectedModules || []) {
    const previousModule = lastSavedRecord.modules?.[key]
    const moduleDraft = draft.modules?.[key]
    if (!previousModule || !moduleDraft) {
      continue
    }

    const moduleErrors = {}
    if (previousModule.studyMinutes > 0 && String(moduleDraft.studyMinutes ?? '').trim() === '') {
      moduleErrors.studyMinutes = '请填写数字，或输入 0 清零'
    }
    if (previousModule.questionCount > 0 && String(moduleDraft.questionCount ?? '').trim() === '') {
      moduleErrors.questionCount = '请填写数字，或输入 0 清零'
    }
    if (previousModule.wrongCount > 0 && String(moduleDraft.wrongCount ?? '').trim() === '') {
      moduleErrors.wrongCount = '请填写数字，或输入 0 清零'
    }

    if (Object.keys(moduleErrors).length > 0) {
      result[key] = moduleErrors
    }
  }

  return result
}
