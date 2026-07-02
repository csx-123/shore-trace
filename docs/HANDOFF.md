# Shore Trace 公考学习记录交接文档

生成时间：2026-07-02  
当前分支：`phase-2-history-statistics`  
最近提交：`093c262 style: improve mobile record form ergonomics`
交接文档状态：接手检查时 `docs/HANDOFF.md` 尚未提交，应先作为独立文档变更提交，再继续第二阶段业务开发。

## 1. 项目概述

项目名称：Shore Trace 公考学习记录。

项目目标：做一个手机优先、长期可用的公考学习记录工具，围绕“快速记录 -> 自动保存 -> 留下明日重点 -> 第二天继续执行”的轻量闭环。

目标用户：正在备考公务员考试、需要每天快速记录行测/申论训练情况并持续复盘的个人用户。

当前产品定位：本地优先的移动端学习记录 MVP。当前只完成第一阶段“记录闭环”，重点是低填写成本、数据不轻易丢失、手机端可用。

当前 MVP 范围：

- 今日/指定日期学习记录。
- 日期切换和历史日期补录入口。
- 历史记录列表和历史记录详情。
- 历史记录编辑入口，跳转到 `/record?date=YYYY-MM-DD`。
- 动态选择当天学习过的模块。
- 记录学习分钟、做题数、错题数。
- 固定错因标签。
- 自定义错因（第一阶段实际代码已包含该功能）。
- 模块备注、今日收获、明日重点。
- 自动保存和手动保存。
- 本地数据校验与异常保护。
- 手机优先 UI。

当前明确不做的功能：

- 登录注册、后端服务、云同步、多设备同步。
- 统计页、JSON 导出。
- PWA 安装、service worker、离线缓存、新版本提示。
- AI 复盘、复杂规则建议、复杂趋势图。
- 题型字典管理、题型标签统计。
- 数据导入、会员系统。

## 2. 技术栈

- 前端框架：Vue 3。
- 构建工具：Vite。
- CSS 方案：Tailwind CSS v4，通过 `@tailwindcss/vite` 插件接入。
- 路由：Vue Router。
- 状态管理：未使用 Pinia；使用 Vue Composition API 和 `src/composables/useStudyRecords.js` 管理记录页业务状态。
- PWA 方案：当前未实现，项目中也没有 `vite-plugin-pwa` 依赖。
- 数据存储方式：`localStorage`，通过 `studyRecordRepository` 封装读写。
- 测试方案：轻量 Node 脚本 `scripts/acceptance-tests.mjs`，使用 `node:assert/strict` 测试核心纯函数和 repository 行为。
- 主要依赖：`vue`、`vue-router`。
- 主要开发依赖：`vite`、`@vitejs/plugin-vue`、`tailwindcss`、`@tailwindcss/vite`。

## 3. 项目目录和关键文件

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

- `src/views/RecordView.vue`：记录页组织、日期选择面板、路由日期参数处理、未保存修改确认、手动保存与 toast 反馈。
- `src/views/HistoryView.vue`：历史列表页，展示有效记录摘要、倒序列表、空状态和记录入口。
- `src/views/HistoryDetailView.vue`：历史详情页，展示单日完整记录、缺失日期状态和编辑入口。
- `src/components/BottomNav.vue`：移动端 tabbar 底部导航，在记录页和历史页之间切换，并在 `/record`、`/history`、`/history/:date` 正确显示激活状态。
- `src/components/ModuleSelector.vue`：六个模块选择入口。
- `src/components/ModuleRecordForm.vue`：单个模块的数字字段、错因标签、自定义错因、模块备注。
- `src/components/SaveStatus.vue`：保存状态和最后保存时间展示。
- `src/composables/useStudyRecords.js`：草稿状态、上一次成功保存记录、自动保存、手动保存、删除确认、即时汇总。
- `src/domain/constants.js`：版本号、模块 key、错因标签、localStorage key。
- `src/domain/validators.js`：草稿创建、记录归一化、校验、空模块/空记录判断。
- `src/domain/statistics.js`：历史摘要、详情汇总、有效模块过滤、正确率和编辑链接等纯函数。
- `src/repositories/studyRecordRepository.js`：localStorage 数据访问层，包含读取、保存、删除和异常保护。
- `src/utils/date.js`：本地日期 key、日期校验、时间格式化。
- `scripts/acceptance-tests.mjs`：当前自动化验收测试。
- `README.md`：项目简介、当前版本范围、开发命令、数据说明。
- `AGENTS.md`：当前仓库未发现该文件；本会话中用户提供过 AGENTS 指令。新会话若发现该文件，应优先阅读。

## 4. 已完成内容

### 记录页

- 完成程度：已实现 `/record` 页面，`/` 和未知路径会重定向到 `/record`。
- 对应文件：`src/views/RecordView.vue`、`src/router/index.js`。
- 验证情况：已通过 `npm test`、`npm run build`；曾用手机宽度视口检查页面加载、日期选择器遮罩、模块展开和错因布局。
- 已知限制：没有统计页入口；刷新非法草稿不会恢复，只恢复最后一次合法保存的数据。

### 历史记录查看

- 完成程度：已实现 `/history` 历史列表和 `/history/:date` 历史详情；列表只展示有效记录并按日期倒序排列；详情页支持跳转到 `/record?date=YYYY-MM-DD` 编辑；记录页、历史列表和历史详情通过 tabbar 底部导航切换。
- 对应文件：`src/views/HistoryView.vue`、`src/views/HistoryDetailView.vue`、`src/components/BottomNav.vue`、`src/router/index.js`、`src/domain/statistics.js`。
- 验证情况：测试覆盖历史排序、空记录过滤、空模块过滤、汇总计算、正确率空状态、缺失日期、编辑入口和异常字段兜底；已通过 `npm test`、`npm run build`；使用 430px 移动视口在系统 Chrome 中验证列表、详情、返回、编辑跳转、tabbar 底部导航和刷新后记录页日期恢复。
- 已知限制：历史页只读取并展示已有本地数据；“编辑此记录”按钮是页面底部内容，不固定悬浮；未实现 JSON 导出、数据导入、统计页或自定义错因排行/筛选/复杂统计。

### 日期选择和补录

- 完成程度：使用自定义日期选择面板，不使用原生日期 input；支持上月、下月、回到今天、选择日期；日期面板有遮罩层。
- 对应文件：`src/views/RecordView.vue`、`src/utils/date.js`。
- 验证情况：手机宽度检查过弹层和遮罩；日期工具有测试；日期面板打开时会隐藏底部 tabbar，避免弹层状态下切换底部导航。
- 已知限制：日期选择器是当前页面内部实现，尚未抽出独立组件。

### 模块选择和模块表单

- 完成程度：支持动态选择六个固定模块；未选择模块不会生成数据；模块取消时如已有填写内容会确认。
- 对应文件：`src/components/ModuleSelector.vue`、`src/components/ModuleRecordForm.vue`、`src/composables/useStudyRecords.js`。
- 验证情况：测试覆盖“只选择空模块不创建记录”“保存过滤空模块”；手机视口检查过展开后的紧凑布局。
- 已知限制：模块表单仍在一个组件内承载数字输入、错因、自定义错因和备注，后续若继续变复杂应拆分。

### 错因记录

- 完成程度：支持固定错因标签和自定义错因。固定错因在手机上以两行横向滑动网格展示；自定义错因通过输入框添加，Enter 和 blur 均会尝试添加。
- 对应文件：`src/domain/constants.js`、`src/components/ModuleRecordForm.vue`、`src/domain/validators.js`。
- 验证情况：测试覆盖自定义错因保存、去重和空值过滤。
- 已知限制：当前自定义错因已进入数据结构，但第二阶段不得继续扩展自定义错因排行、筛选或复杂统计；历史详情页只可如实展示已有数据。

### 自动保存和手动保存

- 完成程度：自动保存使用 700ms debounce；手动保存按钮固定在底部；保存状态区分已保存、正在编辑、存在未保存修改、存在校验问题、保存失败。
- 对应文件：`src/composables/useStudyRecords.js`、`src/components/SaveStatus.vue`、`src/views/RecordView.vue`。
- 验证情况：测试覆盖 repository 保存失败不声称已保存；之前手动验收过保存和刷新恢复；手动保存按钮已改为页面底部内容，保存成功使用短暂 toast，顶部右上角状态更新为“已保存”。
- 已知限制：没有端到端自动化测试覆盖浏览器中的 debounce 竞态；仅通过代码审查和手动验证降低风险。

### 校验和数据安全

- 完成程度：数字字段校验为非负整数；错题数不能大于做题数；做题数为 0 时错题数必须为 0；非法输入不写入 localStorage；异常 localStorage 数据会阻止覆盖。
- 对应文件：`src/domain/validators.js`、`src/repositories/studyRecordRepository.js`。
- 验证情况：测试覆盖非法数字、错题数规则、异常 JSON、异常顶层结构、未知模块 key、setItem 抛错。
- 已知限制：没有 TypeScript，类型定义是 JSDoc 注释；运行时仍需依赖校验函数兜底。

### UI 风格和移动端体验

- 完成程度：整体风格使用宁静蓝和玫瑰粉搭配；桌面端限制最大宽度模拟手机；日期弹层有遮罩；文本域自适应高度。
- 对应文件：`src/style.css`、`src/views/RecordView.vue`、`src/components/ModuleRecordForm.vue`。
- 验证情况：手机宽度 390px 检查过核心交互。
- 已知限制：未做多设备真机矩阵测试；软键盘遮挡只做了常规 sticky 保存按钮设计，未系统验证各手机浏览器。

## 5. 当前未完成内容

P0：下一步必须完成

- 任务 2B：JSON 数据导出，导出完整 `{ version: 1, records: ... }`。
- 确保新增页面继续通过 repository 访问数据，不直接读写 localStorage。

P1：MVP 内后续完成

- 统计页 `/statistics`：总学习天数、本周学习天数、本周学习时长、各模块学习时长、各模块做题数、各模块正确率、固定错因次数排行。
- 统计事实结论：使用最低样本门槛，不生成依据不足的建议。
- PWA：manifest、service worker、离线基础页面、新版本提示。
- 更完整的浏览器级回归测试。

P2：暂缓或后续版本考虑

- 数据导入和版本迁移 UI。
- IndexedDB 或后端同步。
- 多设备同步、登录注册。
- 复杂趋势图、AI 复盘、题型字典和题型标签统计。
- 自定义错因的同义归并和复杂排行榜。

## 6. 已确定的重要决策

- 产品范围：第一版优先记录闭环，不做完整学习管理系统。原因是用户需要 60 秒内完成记录，并能连续使用。
- 数据模型：顶层固定 `{ version: 1, records: Record<string, StudyRecord> }`。原因是便于未来版本迁移和导出。
- 模块结构：记录中使用 `Partial<Record<ModuleKey, ModuleRecord>>`，只保存有实际内容的模块。原因是减少空数据污染和填写成本。
- 路由设计：当前已实现 `/record`、`/history` 和 `/history/:date`；原计划中的 `/statistics` 尚未实现。编辑历史记录使用 `/record?date=YYYY-MM-DD`，刷新后可恢复目标日期。
- 本地日期处理：使用 `getLocalDateKey(date)` 读取本地年月日，不使用 `toISOString().slice(0, 10)` 生成业务日期。原因是避免 UTC 日期偏移。
- 自动保存策略：700ms debounce，自动保存不能删除已有记录。原因是减少数据丢失风险。
- 手动保存策略：手动保存负责给用户明确反馈；全部清空已有记录时，只有手动保存才弹出删除确认。
- 校验规则：数字字段必须是非负整数；错题数不能大于做题数；做题数为 0 时错题数必须为 0。原因是保证统计可信。
- 草稿与已保存状态：内存中区分当前草稿和上一次成功保存记录。校验失败只保留草稿，不覆盖最后有效记录。
- Repository 边界：页面和 composable 不直接调用 localStorage；统一通过 `studyRecordRepository`。原因是未来迁移 IndexedDB 或后端时减少改动面。
- Pinia：第一版明确不使用 Pinia。原因是当前共享状态很小，用 composable 足够。
- PWA：当前未实现；后续若进入第三阶段再添加 `vite-plugin-pwa`、manifest、service worker 和更新提示。
- UI 和移动端原则：手机优先，界面简洁，模块按需展开，错因标签降低纵向高度；当前色彩使用宁静蓝 `#92A8D1` / `#6E84B7` 与玫瑰粉 `#F7CAC9`。

## 7. 数据结构

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

字段规则：

- 日期主键格式：设备本地 `YYYY-MM-DD`。
- `date`：与 records 的日期 key 对应，repository 读取时可用 key 作为 fallback。
- `createdAt`：首次成功保存时生成，使用 ISO 8601。
- `updatedAt`：每次成功保存时更新，使用 ISO 8601；保存失败时不更新。
- 空模块过滤：模块数字全为 0、固定错因为空、自定义错因为空、备注为空，则不保存该模块。
- 空记录判断：没有任何保存后的模块，且 `todayGain`、`tomorrowFocus` 均为空，则为空记录。
- 数据版本字段：`version: 1`。
- 本地存储键名：`gongkao-study-records`。

## 8. 业务规则和边界条件

有效记录：

- 至少存在一个非空模块，或 `todayGain` 非空，或 `tomorrowFocus` 非空。
- 模块被选择本身不算有效内容。
- 保存前会过滤空模块。

数字和错题规则：

- `studyMinutes`、`questionCount`、`wrongCount` 必须为非负整数。
- 错题数不能大于做题数。
- 做题数为 0 时，错题数必须为 0。
- 已保存记录中有正数时，用户临时清空对应数字输入框会触发轻量校验，提示输入数字或填 0 清零，避免空输入悄悄覆盖有效数据。

自动保存：

- 草稿变化后触发 700ms debounce。
- 自动保存前会清理上一个 pending timer，因此连续快速输入最终只保存最新状态。
- 加载日期时会临时抑制自动保存。
- 校验失败时自动保存暂停写入，只保留内存草稿并显示校验状态。
- 自动保存不能删除已有记录；已有记录被全部清空时，自动保存只标记为未保存修改。

手动保存和删除：

- 点击“保存记录”会立即校验。
- 若已有记录被全部清空，只有手动保存才弹出确认删除。
- 用户取消删除后，原有效记录仍保留，状态为未保存修改。

未保存修改：

- 切换日期、应用内路由离开、刷新/关闭页面前会提示。
- 放弃修改会丢弃 pending autosave。
- 非法草稿不持久化，刷新后只恢复最后一次合法保存的数据。

保存失败：

- repository 读取异常或 setItem 抛错时返回失败。
- UI 不应显示“已保存”，会显示保存失败或读取异常提示。
- 异常本地数据不会被静默覆盖。

统计规则：

- 统计页尚未实现。
- 已确定后续应按本地时间、周一为一周开始计算本周。
- 已确定最低样本门槛：做题数为 0 不参与正确率比较；建议本周做题数至少 5 道才参与“最低正确率模块”判断；错因至少出现 2 次才展示为高频错因；样本不足显示“数据不足，暂不判断”。

## 9. 已知问题和风险

### 缺少实际 `AGENTS.md`

- 问题表现：本会话中用户提供了 AGENTS 指令，但仓库根目录当前没有 `AGENTS.md` 文件。
- 影响范围：新会话如果只看仓库文件，可能无法获得用户要求的第一性原理和对抗性审查约束。
- 是否已定位原因：已确认 `Test-Path AGENTS.md` 返回 `False`。
- 推荐处理方式：若用户希望长期保留这些规则，应在后续单独创建 `AGENTS.md`；本次任务按要求只创建 `docs/HANDOFF.md`，未新增。

### 项目名包含 PWA 但 PWA 尚未实现

- 问题表现：`package.json` 名称为 `gongkao-study-record-pwa`，README 也称为 PWA 原型，但当前无 PWA 插件和 service worker。
- 影响范围：容易让新开发者误以为 PWA 已完成。
- 是否已定位原因：这是阶段性开发状态，第一阶段故意不做 PWA。
- 推荐处理方式：在第三阶段再实现 PWA；实现前不要在文档中宣称可安装或离线可用。

### 自定义错因与原收敛计划有偏差

- 问题表现：早期 MVP 收敛计划曾建议第一版只统计固定错因，但用户后续明确要求支持自定义错因，当前代码已实现 `customWrongReasons`。
- 影响范围：第二阶段统计页设计需要决定是否展示自定义错因；若统计自定义错因，可能出现同义词噪音。
- 是否已定位原因：用户体验需求变更导致。
- 推荐处理方式：记录页继续保留自定义错因；第二阶段历史详情页只展示已有自定义错因，不增加排行、筛选或复杂统计。统计页 MVP 建议先只统计固定错因，或单独标注自定义错因不参与排行，除非用户重新确认。

### 无 TypeScript 编译检查

- 问题表现：项目使用 `.js` 和 JSDoc 类型定义，没有 `tsc` 类型检查。
- 影响范围：类型错误主要依赖测试和运行时校验发现。
- 是否已定位原因：当前项目从轻量 MVP 出发，没有引入 TypeScript。
- 推荐处理方式：第二阶段继续保持轻量，不为历史/统计页单独引入大型类型迁移；如后续复杂度上升，可计划性迁移。

### 端到端自动化测试不足

- 问题表现：当前测试主要覆盖纯函数和 repository；浏览器交互、软键盘、路由切换竞态没有系统自动化覆盖。
- 影响范围：日期切换、debounce、确认弹窗等交互可能在浏览器差异下出问题。
- 是否已定位原因：第一阶段为了控制复杂度未引入大型测试体系。
- 推荐处理方式：第二阶段至少继续用轻量测试覆盖统计纯函数；关键 UI 流程通过手动手机视口检查。

## 10. 验证情况

已验证：

- `npm test`：通过。覆盖日期工具、空模块过滤、自定义错因、非法数字、错题数规则、repository 异常保护和 setItem 失败。
- 历史页轻量测试：通过。覆盖历史记录倒序、空记录过滤、空模块过滤、汇总计算、做题数为 0 时正确率为空、缺失日期安全处理、编辑入口和异常字段兜底。
- `npm run build`：通过。Vite 生产构建成功。
- 开发服务器：曾验证可通过 Vite 本地开发命令启动；具体端口属于临时机器环境信息，不作为长期交接依据。
- 页面手动测试：曾在移动端视口打开 `/record`，检查页面加载、日期面板、遮罩、模块选择、错因两行横向滑动、备注自适应。
- 历史页手动测试：曾在 390px 移动视口用系统 Chrome 验证 `/history`、`/history/:date`、底部导航、返回历史列表、编辑跳转 `/record?date=YYYY-MM-DD`、刷新后恢复目标日期、缺失日期状态；未发现浏览器 console/page error。
- Git：`main` 已推送到远程；当前 `phase-2-history-statistics` 分支已创建并推送到远程。

未验证：

- PWA 安装、manifest、service worker、离线访问、新版本提示：当前未实现。
- 统计页、JSON 导出：当前未实现。
- 真实手机多浏览器测试：待确认。
- 软键盘弹出时保存按钮在各种手机浏览器中的可访问性：待确认。
- GitHub Actions/CI：仓库当前未发现 CI 配置。

验证失败：

- 无已知验证失败项。

## 11. 下一步推荐任务

推荐任务名称：任务 2B，开发 JSON 数据导出。

目标：

- 实现 JSON 导出按钮，导出完整顶层数据结构。
- 保持历史页和记录页继续通过 repository 访问数据，不直接读写 localStorage。

涉及文件：

- `src/repositories/studyRecordRepository.js`
- `src/views/HistoryView.vue` 或当前最合适的导出入口页面
- `src/domain/statistics.js`（如需复用摘要，保持纯函数）
- `scripts/acceptance-tests.mjs`
- `README.md`（完成后再更新当前能力）

具体实施步骤：

1. 阅读 `AGENTS.md`（若存在）、`docs/HANDOFF.md`、README 和上述核心代码。
2. 先确认当前分支为 `phase-2-history-statistics`，工作区干净。
3. 为 repository 增加 `exportData()` 或等价方法，返回 `{ version: 1, records }`，不要让页面直接访问 localStorage。
4. 增加 JSON 导出按钮：文件名 `gongkao-study-records-YYYY-MM-DD.json`，导出完整顶层结构。
5. 增加轻量测试：repository 导出结构、异常本地数据不被覆盖、导出内容包含完整 records。
6. 运行 `npm test`、`npm run build`，再用手机宽度手动检查。

验收标准：

- JSON 文件包含 `version: 1` 和完整 `records`。
- 页面和 composable 不直接调用 `localStorage`。
- `npm test` 和 `npm run build` 通过。

不应顺带扩大的功能范围：

- 不实现统计页。
- 不实现 PWA。
- 不实现数据导入。
- 不引入后端、登录、云同步、IndexedDB。
- 不加入图表库或 AI 复盘。
- 不把项目迁移到 TypeScript 或 Pinia，除非用户明确要求。

## 12. 新会话启动说明

给新的 Codex 会话：

1. 先阅读 `AGENTS.md`；如果仓库根目录不存在该文件，向用户说明“当前仓库未发现 AGENTS.md”，并询问是否需要根据本交接文档补建。
2. 再阅读 `docs/HANDOFF.md`。
3. 检查实际代码状态是否与交接文档一致，至少查看 `git status --short --branch`、`package.json`、`src/router/index.js`、`src/composables/useStudyRecords.js`、`src/repositories/studyRecordRepository.js`。
4. 先向用户汇报理解和发现的差异。
5. 未经确认不要扩大 MVP 范围。
6. 从“下一步推荐任务”继续，优先开发任务 2B：JSON 数据导出。
