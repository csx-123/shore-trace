import assert from 'node:assert/strict'
import {
  createEmptyRecordDraft,
  normalizeDraftToRecord,
} from '../src/domain/validators.js'
import { STORAGE_KEY } from '../src/domain/constants.js'
import {
  createHistorySummaries,
  createStatisticsSummary,
  getCorrectRateText,
  getHistoryDetail,
  getRecordEditPath,
} from '../src/domain/statistics.js'
import { studyRecordRepository } from '../src/repositories/studyRecordRepository.js'
import { getLocalDateKey, isDateKey } from '../src/utils/date.js'

function moduleDraft(overrides = {}) {
  return {
    studyMinutes: '',
    questionCount: '',
    wrongCount: '',
    wrongReasonTags: [],
    customWrongReasons: [],
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

function historyRecord(date, moduleOverrides = {}, recordOverrides = {}) {
  return {
    date,
    modules: {
      dataAnalysis: {
        studyMinutes: 30,
        questionCount: 10,
        wrongCount: 2,
        wrongReasonTags: ['计算错误'],
        customWrongReasons: [],
        note: '',
        ...moduleOverrides,
      },
    },
    todayGain: '',
    tomorrowFocus: '',
    createdAt: `${date}T01:00:00.000Z`,
    updatedAt: `${date}T02:00:00.000Z`,
    ...recordOverrides,
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

test('repository exports empty app data from empty storage', () => {
  installStorage()
  const result = studyRecordRepository.exportData()
  assert.equal(result.error, null)
  assert.deepEqual(result.data, { version: 1, records: {} })
})

test('repository exports complete sanitized records', () => {
  installStorage(
    JSON.stringify({
      version: 1,
      records: {
        '2026-07-01': historyRecord('2026-07-01'),
        '2026-07-02': historyRecord('2026-07-02', { customWrongReasons: [' 概念混淆 ', '概念混淆'] }),
      },
    }),
  )

  const result = studyRecordRepository.exportData()
  assert.equal(result.error, null)
  assert.deepEqual(Object.keys(result.data.records), ['2026-07-01', '2026-07-02'])
  assert.deepEqual(result.data.records['2026-07-02'].modules.dataAnalysis.customWrongReasons, ['概念混淆'])
})

test('repository export reports abnormal storage without overwriting it', () => {
  let store = installStorage('{"version":1,"records":')
  let result = studyRecordRepository.exportData()
  assert.equal(result.data, null)
  assert.ok(result.error)
  assert.equal(store.get(STORAGE_KEY), '{"version":1,"records":')

  store = installStorage('{"version":2,"records":{}}')
  result = studyRecordRepository.exportData()
  assert.equal(result.data, null)
  assert.ok(result.error)
  assert.equal(store.get(STORAGE_KEY), '{"version":2,"records":{}}')
})

test('history summaries are sorted by date descending', () => {
  const summaries = createHistorySummaries({
    '2026-07-01': historyRecord('2026-07-01'),
    '2026-07-03': historyRecord('2026-07-03'),
    '2026-07-02': historyRecord('2026-07-02'),
  })

  assert.deepEqual(summaries.map((summary) => summary.date), ['2026-07-03', '2026-07-02', '2026-07-01'])
})

test('empty records do not appear in history summaries', () => {
  const summaries = createHistorySummaries({
    '2026-07-01': {
      date: '2026-07-01',
      modules: {},
      todayGain: '',
      tomorrowFocus: '',
      createdAt: '',
      updatedAt: '',
    },
    '2026-07-02': historyRecord('2026-07-02'),
  })

  assert.deepEqual(summaries.map((summary) => summary.date), ['2026-07-02'])
})

test('selected but empty modules do not enter history summaries', () => {
  const summaries = createHistorySummaries({
    '2026-07-02': historyRecord(
      '2026-07-02',
      {
        studyMinutes: 0,
        questionCount: 0,
        wrongCount: 0,
        wrongReasonTags: [],
        customWrongReasons: [],
        note: '',
      },
      { tomorrowFocus: '复盘资料分析' },
    ),
  })

  assert.equal(summaries[0].modules.length, 0)
  assert.deepEqual(summaries[0].totals, { studyMinutes: 0, questionCount: 0, wrongCount: 0 })
})

test('history totals include study minutes, questions, and wrong answers', () => {
  const summaries = createHistorySummaries({
    '2026-07-02': historyRecord(
      '2026-07-02',
      { studyMinutes: 45, questionCount: 20, wrongCount: 4 },
      {
        modules: {
          dataAnalysis: {
            studyMinutes: 45,
            questionCount: 20,
            wrongCount: 4,
            wrongReasonTags: [],
            customWrongReasons: [],
            note: '',
          },
          essay: {
            studyMinutes: 35,
            questionCount: 2,
            wrongCount: 0,
            wrongReasonTags: [],
            customWrongReasons: [],
            note: '',
          },
        },
      },
    ),
  })

  assert.deepEqual(summaries[0].totals, { studyMinutes: 80, questionCount: 22, wrongCount: 4 })
})

test('correct rate is empty when question count is zero', () => {
  assert.equal(getCorrectRateText(0, 0), '')
  assert.equal(getCorrectRateText(10, 2), '80%')
})

test('missing history date is handled safely', () => {
  const detail = getHistoryDetail({ '2026-07-02': historyRecord('2026-07-02') }, '2026-07-03')
  assert.equal(detail, null)
})

test('record edit path includes the target date query', () => {
  assert.equal(getRecordEditPath('2026-07-02'), '/record?date=2026-07-02')
})

test('unknown modules or abnormal fields do not crash history calculations', () => {
  const summaries = createHistorySummaries({
    '2026-07-02': {
      date: '2026-07-02',
      modules: {
        unknown: { studyMinutes: 999 },
        dataAnalysis: {
          studyMinutes: 'bad',
          questionCount: 0,
          wrongCount: 0,
          wrongReasonTags: [],
          customWrongReasons: [],
          note: '错因复盘',
        },
      },
      todayGain: '',
      tomorrowFocus: '',
      createdAt: '',
      updatedAt: '',
    },
  })

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].modules.length, 1)
  assert.deepEqual(summaries[0].totals, { studyMinutes: 0, questionCount: 0, wrongCount: 0 })
})

test('statistics summary aggregates total and current week study data', () => {
  const summary = createStatisticsSummary(
    {
      '2026-06-28': historyRecord('2026-06-28', { studyMinutes: 20, questionCount: 5, wrongCount: 1 }),
      '2026-06-29': historyRecord('2026-06-29', { studyMinutes: 30, questionCount: 10, wrongCount: 2 }),
      '2026-07-02': historyRecord('2026-07-02', { studyMinutes: 40, questionCount: 20, wrongCount: 5 }),
    },
    '2026-07-03',
  )

  assert.equal(summary.totalStudyDays, 3)
  assert.equal(summary.totalStudyMinutes, 90)
  assert.equal(summary.totalQuestionCount, 35)
  assert.equal(summary.totalWrongCount, 8)
  assert.equal(summary.totalCorrectRateText, '77.1%')
  assert.equal(summary.weekStudyDays, 2)
  assert.equal(summary.weekStudyMinutes, 70)
  assert.deepEqual(summary.weekRange, { start: '2026-06-29', end: '2026-07-05' })
})

test('statistics current week excludes future records after the reference date', () => {
  const summary = createStatisticsSummary(
    {
      '2026-07-03': historyRecord('2026-07-03', { studyMinutes: 30, questionCount: 10, wrongCount: 1 }),
      '2026-07-05': historyRecord('2026-07-05', { studyMinutes: 60, questionCount: 20, wrongCount: 2 }),
    },
    '2026-07-03',
  )

  assert.equal(summary.totalStudyDays, 2)
  assert.equal(summary.totalStudyMinutes, 90)
  assert.equal(summary.weekStudyDays, 1)
  assert.equal(summary.weekStudyMinutes, 30)
  assert.deepEqual(summary.weekRange, { start: '2026-06-29', end: '2026-07-05' })
})

test('statistics counts gain-only records as study days without module totals', () => {
  const summary = createStatisticsSummary(
    {
      '2026-07-02': {
        date: '2026-07-02',
        modules: {},
        todayGain: '复盘了资料分析错题',
        tomorrowFocus: '',
        createdAt: '2026-07-02T01:00:00.000Z',
        updatedAt: '2026-07-02T02:00:00.000Z',
      },
    },
    '2026-07-03',
  )

  assert.equal(summary.totalStudyDays, 1)
  assert.equal(summary.weekStudyDays, 1)
  assert.equal(summary.totalStudyMinutes, 0)
  assert.equal(summary.moduleStats.every((module) => module.studyMinutes === 0), true)
})

test('statistics summary aggregates module totals and fixed wrong reason ranking', () => {
  const summary = createStatisticsSummary(
    {
      '2026-07-01': historyRecord('2026-07-01', {}, {
        modules: {
          dataAnalysis: {
            studyMinutes: 30,
            questionCount: 10,
            wrongCount: 2,
            wrongReasonTags: ['计算错误', '粗心'],
            customWrongReasons: ['概念混淆'],
            note: '',
          },
          essay: {
            studyMinutes: 50,
            questionCount: 2,
            wrongCount: 0,
            wrongReasonTags: ['粗心'],
            customWrongReasons: [],
            note: '',
          },
        },
      }),
      '2026-07-02': historyRecord('2026-07-02', {
        studyMinutes: 20,
        questionCount: 5,
        wrongCount: 1,
        wrongReasonTags: ['计算错误'],
      }),
    },
    '2026-07-03',
  )

  const dataAnalysis = summary.moduleStats.find((module) => module.key === 'dataAnalysis')
  const essay = summary.moduleStats.find((module) => module.key === 'essay')
  assert.deepEqual(
    {
      studyMinutes: dataAnalysis.studyMinutes,
      questionCount: dataAnalysis.questionCount,
      wrongCount: dataAnalysis.wrongCount,
      correctRateText: dataAnalysis.correctRateText,
    },
    { studyMinutes: 50, questionCount: 15, wrongCount: 3, correctRateText: '80%' },
  )
  assert.deepEqual(
    {
      studyMinutes: essay.studyMinutes,
      questionCount: essay.questionCount,
      wrongCount: essay.wrongCount,
      correctRateText: essay.correctRateText,
    },
    { studyMinutes: 50, questionCount: 2, wrongCount: 0, correctRateText: '100%' },
  )
  assert.deepEqual(summary.wrongReasonRanking, [
    { tag: '计算错误', count: 2 },
    { tag: '粗心', count: 2 },
  ])
})
