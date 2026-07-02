/**
 * @typedef {'dataAnalysis' | 'quantitativeReasoning' | 'verbalComprehension' | 'judgmentReasoning' | 'essay' | 'commonKnowledge'} ModuleKey
 * @typedef {'审题不清' | '计算错误' | '知识点遗忘' | '时间不足' | '方法不熟' | '理解偏差' | '粗心' | '积累不足' | '题型没识别' | '方法没调用' | '材料定位错误' | '选项利用不足' | '公式使用错误'} WrongReasonTag
 *
 * @typedef {Object} ModuleRecord
 * @property {number} studyMinutes
 * @property {number} questionCount
 * @property {number} wrongCount
 * @property {WrongReasonTag[]} wrongReasonTags
 * @property {string[]} customWrongReasons
 * @property {string} note
 *
 * @typedef {Object} StudyRecord
 * @property {string} date
 * @property {Partial<Record<ModuleKey, ModuleRecord>>} modules
 * @property {string} todayGain
 * @property {string} tomorrowFocus
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} AppData
 * @property {1} version
 * @property {Record<string, StudyRecord>} records
 */

export {}
