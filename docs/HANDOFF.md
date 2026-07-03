# Shore Trace 公考学习记录交接文档

更新时间：2026-07-03  
当前分支：`phase-2-history-statistics`  
远程状态：最新提交已推送到 `origin/phase-2-history-statistics`；当前工作区有文档/文案同步修改尚未提交  
最近提交：`acb7825 feat: add history JSON export`

## 1. 项目当前状态

项目名称：Shore Trace 公考学习记录。

产品目标：做一个手机优先、本地优先、长期可用的公考学习记录工具，围绕“快速记录 -> 自动保存 -> 留下明日重点 -> 第二天继续执行”的轻量闭环。

目标用户：正在备考公务员考试、需要每天快速记录行测/申论训练情况并持续复盘的个人用户。

当前阶段：第二阶段 2B 暂时完成。当前版本已经具备记录闭环、历史查看、历史详情、历史编辑入口和 JSON 导出能力。

当前 MVP 范围：

- 今日/指定日期学习记录。
- 日期切换和历史日期补录入口。
- 历史记录列表和历史记录详情。
- 历史记录编辑入口，跳转到 `/record?date=YYYY-MM-DD`。
- 动态选择当天学习过的模块。
- 记录学习分钟、做题数、错题数。
- 固定错因标签。
- 自定义错因。
- 模块备注、今日收获、明日重点。
- 自动保存和手动保存。
- 本地数据校验与异常保护。
- JSON 数据导出。
- 手机优先 UI。

当前仍明确不做：

- 登录注册、后端服务、云同步、多设备同步。
- 统计页 `/statistics`。
- PWA 安装、service worker、离线缓存、新版本提示。
- 数据导入和版本迁移 UI。
- 图表库、复杂趋势图、AI 复盘。
- 题型字典管理、题型标签统计、会员系统。

## 2. 技术栈

- 前端框架：Vue 3。
- 构建工具：Vite。
- CSS 方案：Tailwind CSS v4，通过 `@tailwindcss/vite` 插件接入。
- 路由：Vue Router。
- 状态管理：未使用 Pinia；使用 Vue Composition API 和 `src/composables/useStudyRecords.js` 管理记录页业务状态。
- 数据存储：`localStorage`，通过 `studyRecordRepository` 封装读写。
- 测试方案：轻量 Node 脚本 `scripts/acceptance-tests.mjs`，使用 `node:assert/strict` 测核心纯函数和 repository 行为。
- 主要依赖：`vue`、`vue-router`。
- 主要开发依赖：`vite`、`@vitejs/plugin-vue`、`tailwindcss`、`@tailwindcss/vite`。
- PWA：尚未实现；项目中没有 `vite-plugin-pwa`。
- TypeScript：尚未引入；当前使用 `.js` 和 JSDoc/运行时校验。

## 3. 关键目录和职责

```text
src/
  App.vue
  main.js
  style.css
  router/index.js
  views/RecordView.vue
  views/HistoryView.vue
  views/HistoryDetailView.vue
  components/BottomNav.vue
  components/ModuleSelector.vue
  components/ModuleRecordForm.vue
  components/SaveStatus.vue
  composables/useStudyRecords.js
  domain/constants.js
  domain/saveState.js
  domain/statistics.js
  domain/types.js
  domain/validators.js
  repositories/studyRecordRepository.js
  utils/date.js
scripts/acceptance-tests.mjs
public/favicon.svg
public/icons.svg
README.md
package.json
vite.config.js
docs/HANDOFF.md
```

关键职责：

- `src/views/RecordView.vue`：记录页组织、日期选择面板、路由日期 query 处理、未保存修改确认、手动保存与 toast 反馈。
- `src/views/HistoryView.vue`：历史列表页，展示有效记录摘要、倒序列表、空状态、记录入口和 JSON 导出入口。
- `src/views/HistoryDetailView.vue`：历史详情页，展示单日完整记录、缺失日期状态和编辑入口。
- `src/components/BottomNav.vue`：移动端 tabbar，在记录页和历史页之间切换，并在 `/record`、`/history`、`/history/:date` 显示激活状态。
- `src/components/ModuleSelector.vue`：六个固定模块选择入口。
- `src/components/ModuleRecordForm.vue`：单个模块的数字字段、固定错因、自定义错因、模块备注。
- `src/components/SaveStatus.vue`：保存状态和最后保存时间展示。
- `src/composables/useStudyRecords.js`：记录页草稿、上一次成功保存记录、自动保存、手动保存、删除确认、即时汇总。
- `src/domain/constants.js`：版本号、模块 key、固定错因标签、localStorage key。
- `src/domain/validators.js`：草稿创建、记录归一化、校验、空模块/空记录判断。
- `src/domain/statistics.js`：历史摘要、详情汇总、有效模块过滤、正确率、编辑链接等纯函数。
- `src/repositories/studyRecordRepository.js`：localStorage 数据访问层，包含读取、保存、删除、导出和异常保护。
- `src/utils/date.js`：本地日期 key、日期校验、时间格式化。
- `scripts/acceptance-tests.mjs`：当前自动化验收测试。
- `README.md`：已同步当前能力，标明历史列表、历史详情、历史编辑入口和 JSON 导出已完成。
- `AGENTS.md`：仓库根目录当前没有该文件；本会话由用户直接提供了 AGENTS 指令。

## 4. 已完成内容

### 记录页

- 已实现 `/record` 页面，`/` 和未知路径会重定向到 `/record`。
- 支持指定日期记录、历史日期补录、动态模块选择、固定错因、自定义错因、模块备注、今日收获、明日重点。
- 支持自动保存和手动保存。
- 支持未保存修改提示：切换日期、应用内路由离开、刷新/关闭页面前会提示。
- 支持读取异常和保存失败提示。
- 已修复记录页顶部栏 sticky 行为：移除了主容器 `overflow-hidden`，并移除日期卡片高于顶部栏的 `z-20`。
- 已修复固定错因标签移动端溢出：固定错因按钮更宽，允许文字换行。

已知限制：

- 日期选择器仍在 `RecordView.vue` 内部实现，尚未抽独立组件。
- 模块表单仍在一个组件内承载多个职责，后续变复杂时可拆分。
- 记录页底部说明文案已同步当前状态；统计、PWA 和导入仍明确后续再做。

### 历史记录查看

- 已实现 `/history` 历史列表和 `/history/:date` 历史详情。
- 历史列表只展示有效记录，并按日期倒序排列。
- 历史详情展示单日汇总、有效模块、正确率、固定错因、自定义错因、备注、今日收获、明日重点、创建时间和更新时间。
- 缺失或无效日期会显示“未找到该记录”，不会崩溃。
- 历史详情支持“编辑此记录”，跳转到 `/record?date=YYYY-MM-DD`。
- 记录页、历史列表、历史详情通过底部 tabbar 切换。

已知限制：

- 历史列表在页面 setup 时读取一次本地数据；页面长期保持打开时，不会自动响应其他标签页或外部 localStorage 变化。
- “编辑此记录”按钮是页面底部内容，不是固定悬浮按钮。
- 历史页不做筛选、搜索、复杂统计或自定义错因排行。

### JSON 数据导出

- 已实现历史页顶部“导出”按钮。
- 导出文件名：`gongkao-study-records-YYYY-MM-DD.json`。
- 导出内容：清洗后的完整应用数据 `{ version: 1, records: ... }`。
- 页面不直接访问 `localStorage`，而是通过 `studyRecordRepository.exportData()` 获取数据。
- 空数据时不下载空文件，会提示“暂无可导出的已保存记录。请先保存一条记录。”
- 成功触发下载后提示“导出已开始，请查看浏览器下载记录。”
- localStorage 数据异常时不导出安全空数据，会提示“本地数据异常，暂时无法导出。”
- 下载过程使用 `Blob` 和临时 object URL，并在 `finally` 中释放 URL。

已知限制：

- 导出的是 repository 清洗后的业务数据，不是 localStorage 原始字节级备份。
- 真实手机和微信内置浏览器的下载体验尚未系统验证。
- 极端大数据下，`JSON.stringify` 和 Blob 生成仍在主线程执行。

### 移动端 UI 调整

- BottomNav 高度已压缩，图标放大到 `28px`，文字同步调回 `text-sm`。
- 固定错因标签已调整为更适合移动端的两行横向滚动布局，不再明显溢出按钮。
- 自定义错因标签支持超长文本换行，避免页面横向滚动。

## 5. 数据结构

代码依据：`src/domain/types.js`、`src/domain/constants.js`、`src/domain/validators.js`、`src/repositories/studyRecordRepository.js`。

```js
AppData = {
  version: 1,
  records: Record<string, StudyRecord>,
}

StudyRecord = {
  date: string,
  modules: Partial<Record<ModuleKey, ModuleRecord>>,
  todayGain: string,
  tomorrowFocus: string,
  createdAt: string,
  updatedAt: string,
}

ModuleRecord = {
  studyMinutes: number,
  questionCount: number,
  wrongCount: number,
  wrongReasonTags: WrongReasonTag[],
  customWrongReasons: string[],
  note: string,
}
```

模块 key：

- `dataAnalysis`：资料分析
- `quantitativeReasoning`：数量关系
- `verbalComprehension`：言语理解
- `judgmentReasoning`：判断推理
- `essay`：申论
- `commonKnowledge`：常识

固定错因标签：

- 审题不清
- 计算错误
- 知识点遗忘
- 时间不足
- 方法不熟
- 理解偏差
- 粗心
- 积累不足
- 题型没识别
- 方法没调用
- 材料定位错误
- 选项利用不足
- 公式使用错误

本地存储键名：`gongkao-study-records`。

## 6. 业务规则和边界条件

有效记录：

- 至少存在一个非空模块，或 `todayGain` 非空，或 `tomorrowFocus` 非空。
- 模块被选择本身不算有效内容。
- 保存前会过滤空模块。
- 历史列表和历史详情只展示有效记录。

数字和错题规则：

- `studyMinutes`、`questionCount`、`wrongCount` 必须是非负整数。
- 错题数不能大于做题数。
- 做题数为 0 时，错题数必须为 0。
- 已保存记录中有正数时，用户临时清空对应数字输入框会触发轻量校验，提示输入数字或填 0 清零，避免空输入悄悄覆盖有效数据。

自动保存：

- 草稿变化后触发 700ms debounce。
- 自动保存前会清理上一个 pending timer。
- 加载日期时会临时抑制自动保存。
- 校验失败时自动保存暂停写入，只保留内存草稿并显示校验状态。
- 自动保存不能删除已有记录；已有记录被全部清空时，自动保存只标记为未保存修改。

手动保存和删除：

- 点击“保存记录”会立即校验。
- 若已有记录被全部清空，只有手动保存才弹出确认删除。
- 用户取消删除后，原有效记录仍保留，状态为未保存修改。

Repository 边界：

- 页面和 composable 不直接读写 `localStorage`。
- 统一通过 `studyRecordRepository` 读取、保存、删除和导出。
- 异常 JSON、异常顶层结构、未知模块 key、题数异常等会阻止覆盖已有本地数据。

JSON 导出规则：

- 导出前通过 repository 重新读取并清洗数据。
- 数据异常时返回 `{ data: null, error }`，UI 不下载文件。
- 空 records 时 UI 不下载空文件，而是提示用户先保存一条记录。
- 非空导出下载 `{ version: 1, records }`。

## 7. 验证情况

最近一次完整验证在 2026-07-03 完成。

自动验证：

- `npm test`：通过。
- `npm run build`：通过。

测试覆盖包括：

- 本地日期工具。
- 空模块过滤。
- 自定义错因保存、去重和空值过滤。
- 非法数字和错题数规则。
- repository 空存储保存。
- malformed JSON 和异常顶层结构保护。
- 未知模块 key 保护。
- `setItem` 失败不声称保存成功。
- 历史记录倒序。
- 空记录和空模块过滤。
- 历史汇总计算。
- 做题数为 0 时正确率为空。
- 缺失日期安全处理。
- 历史编辑入口路径。
- 异常字段兜底。
- JSON 导出空数据结构。
- JSON 导出完整清洗后 records。
- JSON 导出遇异常 storage 时返回 error 且不覆盖原 storage。

浏览器验证：

- 使用 Vite dev server 和系统 Chrome 390px 移动视口验证过核心流程。
- 验证 `/record` 顶部栏 sticky，不再被日期卡片遮挡。
- 验证日期面板打开时遮罩可见，底部 tabbar 隐藏。
- 验证固定错因标签无溢出，页面无横向滚动。
- 验证 tabbar 高度约 55px，图标约 28px。
- 验证 `/history` 空数据导出提示。
- 验证非空数据 JSON 下载文件名和内容。
- 验证历史列表倒序、历史详情、返回、编辑跳转 `/record?date=YYYY-MM-DD`。
- 验证缺失日期状态。
- 验证异常 localStorage 下历史页和导出错误提示。
- 验证期间未发现浏览器 console/page error。

未系统验证：

- 真实手机多浏览器矩阵。
- 微信内置浏览器对 Blob 下载的实际体验。
- 极端大数据导出性能。
- 多标签页长期并发编辑一致性。
- GitHub Actions/CI；仓库当前未发现 CI 配置。

## 8. 多代理对抗式自检结论

2026-07-03 对第二阶段 2B 执行过一次多代理、对抗式、证据驱动自检。限定范围为历史列表、历史详情、历史编辑入口、依赖数据逻辑和 JSON 导出；统计页、PWA、导入、图表排除。

结论：

- 未确认 P0/P1 阻断问题。
- 当前版本可以进入下一阶段。
- 发现若干 P2/P3 风险，建议登记并在合适阶段修复。

已确认/登记的问题：

1. 文档与页面阶段文案过期。  
   已在本轮收口中同步 `README.md` 和 `RecordView.vue` 页面底部说明，明确历史列表、历史详情、历史编辑入口和 JSON 导出已完成；统计、PWA、导入仍未实现。该项不再阻断进入统计页开发。

2. 单条异常数据会阻断全库读取/导出。  
   当前 repository 策略是保护异常数据不被覆盖，遇到未知模块 key、题数异常等会返回 error 和安全空数据。当前无导入功能，普通 UI 路径不应产生此类数据；未来做导入/迁移前应设计坏记录隔离策略。

3. 多标签/长期打开页面一致性未设计。  
   红队提出多快照全量写回风险。主代理用真实 UI 双标签保存不同日期复现，结果两条记录均保留，未复现数据丢失。最终裁决为后续风险，不阻断当前单设备单标签 MVP。

4. `studyRecordRepository.save(record)` 不自校验。  
   当前 UI 保存前经过 `normalizeDraftToRecord`，现有路径可用。未来新增导入、同步或批量写入入口前，应考虑让 repository 自校验或收紧接口。

5. Vue 可维护性风险。  
   `ModuleRecordForm.vue` 直接深层修改 `props.modelValue`；当前能工作，但长期看会增加迁移 Pinia/不可变状态/远程同步时的风险。

6. 业务规则重复。  
   空模块、有效记录、清洗、历史汇总规则分散在 validators、repository、statistics、useStudyRecords 中。当前有测试覆盖，但新增字段时容易漏改。

7. `URL.revokeObjectURL` 下载兼容性。  
   当前浏览器验证通过，但不同手机浏览器/内置 WebView 下载体验仍需真机确认。

## 9. 当前 Git 状态

最后确认状态：

- 当前分支：`phase-2-history-statistics`
- 本地与远端：最新提交已同步 `origin/phase-2-history-statistics`；当前工作区存在未提交文档/文案修改
- 最新提交：`acb7825 feat: add history JSON export`
- 该提交已推送到远程。

最近提交：

```text
acb7825 feat: add history JSON export
859abd2 feat: add history records view
9ab83dc docs: add project handoff
093c262 style: improve mobile record form ergonomics
4682950 feat: implement study record MVP
```

当前未提交修改包括 `README.md`、`src/views/RecordView.vue` 和 `docs/HANDOFF.md`，均属于文档/文案同步范围。若用户要求，可单独提交为一次文档同步提交。

## 10. 当前文档/文案收口状态

已处理：

- `README.md` 已标明记录闭环、历史列表、历史详情、历史编辑入口和 JSON 导出已完成。
- `README.md` 的“暂未实现”已收敛为统计页、PWA 离线安装、数据导入、登录/后端/云同步。
- `README.md` 数据说明已改为支持 JSON 导出，尚未支持导入或多设备同步。
- `src/views/RecordView.vue` 页面底部提示已改为“可在历史页查看记录并导出 JSON；统计、PWA 和导入后续再做”。

仍需注意：

- `docs/HANDOFF.md` 当前本身仍未提交。
- P2/P3 工程风险继续登记，但不建议在进入统计页前集中修复，以免扩大 MVP 范围。

## 11. 下一步建议

推荐下一步：进入统计页 `/statistics` 的设计与实现准备。

进入统计页前建议先提交当前文档/文案同步修改，作为 2B 完成后的交接基线；不需要先修复全部 P2/P3 风险。

统计页建议范围：

- 总学习天数。
- 本周学习天数。
- 本周学习时长。
- 各模块学习时长。
- 各模块做题数。
- 各模块正确率。
- 固定错因次数排行。
- 统计事实结论使用最低样本门槛，不生成依据不足的建议。

统计页建议暂不做：

- 自定义错因复杂排行。
- 图表库。
- AI 复盘。
- 数据导入。
- PWA。
- 后端、登录、云同步。

统计页实现建议：

1. 先在 `src/domain/statistics.js` 增加纯函数，输入 `records`，输出统计摘要。
2. 继续通过 `studyRecordRepository.getAll()` 读取数据，不直接访问 `localStorage`。
3. 先写 `scripts/acceptance-tests.mjs` 的统计纯函数测试。
4. 再加 `/statistics` 路由和页面。
5. 扩展 `BottomNav.vue` 为三项导航时，注意移动端高度和可点击面积。
6. 跑 `npm test`、`npm run build`，再做 390px 移动视口浏览器验证。

## 12. 新会话启动建议

给新 Codex 会话：

1. 先确认仓库根目录是否存在 `AGENTS.md`；当前没有。
2. 阅读本文件 `docs/HANDOFF.md`。
3. 查看 `git status --short --branch` 和最近提交，确认是否包含本交接文档更新。
4. 查看 `package.json`、`src/router/index.js`、`src/views/HistoryView.vue`、`src/views/HistoryDetailView.vue`、`src/views/RecordView.vue`、`src/domain/statistics.js`、`src/repositories/studyRecordRepository.js`、`scripts/acceptance-tests.mjs`。
5. 不要把 README 中“历史页/JSON 导出未实现”的旧描述当作事实；以代码和本交接文档为准。
6. 未经用户确认，不要扩大 MVP 范围。
7. 当前 README、记录页底部提示和本交接文档已完成收口；若开始下一阶段，可以从统计页 `/statistics` 设计与实现准备继续。
