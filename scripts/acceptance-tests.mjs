import assert from 'node:assert/strict'
import {
  createEmptyRecordDraft,
  normalizeDraftToRecord,
} from '../src/domain/validators.js'
import { STORAGE_KEY } from '../src/domain/constants.js'
import { studyRecordRepository } from '../src/repositories/studyRecordRepository.js'
import { getLocalDateKey, isDateKey } from '../src/utils/date.js'

function moduleDraft(overrides = {}) {
  return {
    studyMinutes: '',
    questionCount: '',
    wrongCount: '',
    wrongReasonTags: [],
    note: '',
    ...overrides,
  }
}

function makeDraft(date = '2026-07-02') {
  return createEmptyRecordDraft(date)
}

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('local date key uses local calendar fields', () => {
  assert.equal(getLocalDateKey(new Date(2026, 6, 2, 23, 59)), '2026-07-02')
  assert.equal(isDateKey('2026-07-02'), true)
  assert.equal(isDateKey('2026-02-31'), false)
})

test('selected but empty module does not create a record', () => {
  const draft = makeDraft()
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft()

  const result = normalizeDraftToRecord(draft)
  assert.equal(result.ok, true)
  assert.equal(result.empty, true)
})

test('saving filters empty modules and keeps only real module content', () => {
  const draft = makeDraft()
  draft.selectedModules = ['dataAnalysis', 'essay']
  draft.modules.dataAnalysis = moduleDraft({ studyMinutes: '45', questionCount: '20', wrongCount: '3' })
  draft.modules.essay = moduleDraft()

  const result = normalizeDraftToRecord(draft)
  assert.equal(result.ok, true)
  assert.deepEqual(Object.keys(result.record.modules), ['dataAnalysis'])
})

test('custom wrong reasons are saved and count as module content', () => {
  const draft = makeDraft()
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft({
    customWrongReasons: ['概念混淆', ' 概念混淆 ', ''],
  })

  const result = normalizeDraftToRecord(draft)
  assert.equal(result.ok, true)
  assert.deepEqual(result.record.modules.dataAnalysis.customWrongReasons, ['概念混淆'])
})

test('invalid numeric input fails validation and returns no record', () => {
  const draft = makeDraft()
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft({ studyMinutes: 'abc' })

  const result = normalizeDraftToRecord(draft)
  assert.equal(result.ok, false)
  assert.equal(result.record, undefined)
})

test('wrong count cannot exceed question count, including zero question count', () => {
  const draft = makeDraft()
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft({ questionCount: '0', wrongCount: '1' })

  assert.equal(normalizeDraftToRecord(draft).ok, false)

  draft.modules.dataAnalysis.questionCount = '10'
  draft.modules.dataAnalysis.wrongCount = '12'
  assert.equal(normalizeDraftToRecord(draft).ok, false)

  draft.modules.dataAnalysis.wrongCount = '3'
  assert.equal(normalizeDraftToRecord(draft).ok, true)
})

test('temporarily clearing an existing numeric field keeps previous valid value', () => {
  const previous = {
    date: '2026-07-02',
    modules: {
      dataAnalysis: {
        studyMinutes: 50,
        questionCount: 10,
        wrongCount: 2,
        wrongReasonTags: [],
        note: '',
      },
    },
    todayGain: '',
    tomorrowFocus: '',
    createdAt: '2026-07-02T01:00:00.000Z',
    updatedAt: '2026-07-02T01:00:00.000Z',
  }
  const draft = createEmptyRecordDraft('2026-07-02')
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft({ studyMinutes: '', questionCount: '', wrongCount: '1' })

  const result = normalizeDraftToRecord(draft, previous)
  assert.equal(result.ok, true)
  assert.equal(result.record.modules.dataAnalysis.studyMinutes, 50)
  assert.equal(result.record.modules.dataAnalysis.questionCount, 10)
  assert.equal(result.record.modules.dataAnalysis.wrongCount, 1)
  assert.equal(result.record.createdAt, previous.createdAt)
  assert.match(result.record.updatedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('explicit zero can clear previous numeric values', () => {
  const previous = {
    date: '2026-07-02',
    modules: {
      dataAnalysis: {
        studyMinutes: 50,
        questionCount: 10,
        wrongCount: 2,
        wrongReasonTags: [],
        note: '',
      },
    },
    todayGain: '',
    tomorrowFocus: '',
    createdAt: '2026-07-02T01:00:00.000Z',
    updatedAt: '2026-07-02T01:00:00.000Z',
  }
  const draft = createEmptyRecordDraft('2026-07-02')
  draft.selectedModules = ['dataAnalysis']
  draft.modules.dataAnalysis = moduleDraft({ studyMinutes: '0', questionCount: '0', wrongCount: '0' })

  const result = normalizeDraftToRecord(draft, previous)
  assert.equal(result.ok, true)
  assert.equal(result.empty, true)
})

function installStorage(initialValue, options = {}) {
  const store = new Map()
  if (initialValue !== undefined) {
    store.set(STORAGE_KEY, initialValue)
  }
  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        if (options.throwOnSet) {
          throw new Error('quota exceeded')
        }
        store.set(key, value)
      },
      removeItem: (key) => store.delete(key),
    },
  }
  return store
}

function validRecord() {
  return {
    date: '2026-07-02',
    modules: {
      dataAnalysis: {
        studyMinutes: 30,
        questionCount: 10,
        wrongCount: 2,
        wrongReasonTags: ['计算错误'],
        customWrongReasons: ['概念混淆'],
        note: '',
      },
    },
    todayGain: '',
    tomorrowFocus: '',
    createdAt: '2026-07-02T01:00:00.000Z',
    updatedAt: '2026-07-02T02:00:00.000Z',
  }
}

test('repository starts from empty storage and saves valid record', () => {
  const store = installStorage()
  const result = studyRecordRepository.save(validRecord())
  assert.equal(result.ok, true)
  assert.match(store.get(STORAGE_KEY), /2026-07-02/)
  assert.match(store.get(STORAGE_KEY), /概念混淆/)
})

test('repository does not overwrite malformed JSON or abnormal top-level values', () => {
  let store = installStorage('{"version":1,"records":')
  assert.equal(studyRecordRepository.save(validRecord()).ok, false)
  assert.equal(store.get(STORAGE_KEY), '{"version":1,"records":')

  for (const raw of ['null', '[]', '"bad"', '{"version":2,"records":{}}']) {
    store = installStorage(raw)
    assert.equal(studyRecordRepository.save(validRecord()).ok, false)
    assert.equal(store.get(STORAGE_KEY), raw)
  }
})

test('repository sanitizes missing fields on read', () => {
  installStorage(
    JSON.stringify({
      version: 1,
      records: {
        '2026-07-02': {
          date: '2026-07-02',
          modules: {
            dataAnalysis: {
              studyMinutes: 20,
              questionCount: 5,
              wrongCount: 1,
              wrongReasonTags: ['计算错误'],
              customWrongReasons: ['概念混淆', '概念混淆', ''],
            },
          },
          extra: true,
        },
      },
    }),
  )

  const { record, error } = studyRecordRepository.getByDate('2026-07-02')
  assert.equal(error, null)
  assert.deepEqual(Object.keys(record.modules), ['dataAnalysis'])
  assert.deepEqual(record.modules.dataAnalysis.customWrongReasons, ['概念混淆'])
  assert.equal(record.todayGain, '')
  assert.equal(record.tomorrowFocus, '')
})

test('repository protects storage with unknown module keys instead of overwriting', () => {
  const store = installStorage(
    JSON.stringify({
      version: 1,
      records: {
        '2026-07-02': {
          date: '2026-07-02',
          modules: {
            dataAnalysis: {
              studyMinutes: 20,
              questionCount: 5,
              wrongCount: 1,
              wrongReasonTags: ['计算错误'],
              customWrongReasons: [],
            },
            unknown: { studyMinutes: 999 },
          },
        },
      },
    }),
  )

  const result = studyRecordRepository.save(validRecord())
  assert.equal(result.ok, false)
  assert.match(store.get(STORAGE_KEY), /unknown/)
})

test('repository reports setItem failure without claiming saved', () => {
  installStorage(null, { throwOnSet: true })
  const result = studyRecordRepository.save(validRecord())
  assert.equal(result.ok, false)
})
