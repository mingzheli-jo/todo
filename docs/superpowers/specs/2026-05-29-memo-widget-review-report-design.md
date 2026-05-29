# 设计：速记备忘录 + Android 桌面小部件 + 每日复盘改造

- 日期：2026-05-29
- 状态：已确认设计，待写实施计划
- 范围：Toto（后端 FastAPI / Web React / 移动端 Flutter）

## 1. 背景与目标

在现有 Toto 系统中加入三块能力：

1. **速记备忘录**：一个轻量「快速收集箱」，Web 与移动端都能查看与记录，可一键转为任务。
2. **Android 桌面小部件**：从桌面直接快速新建一条备忘或一个任务。
3. **每日复盘改造**：复盘页只聚焦今天（不再内联查询历史），并新增一个独立的复盘报表/历史页（心情趋势图 + 时间线列表）。

三块共用同一份云端 API 与数据层，Web/移动端数据自动一致。

## 2. 关键设计决策（已与用户确认）

- 备忘录形态：**快速收集箱**（极简文字条目，随手速记，可转任务），不是富文本笔记。
- 备忘生命周期：**两态——未处理 / 已完成**。勾选完成保留记录；「转任务」后原备忘自动标记已完成并关联到新任务；支持手动删除。
- 小部件形态：**快捷入口 + 轻量速记框**（两个按钮，不在小部件内显示统计）。平台：**Android Only**（设备小米 K40，`flutter_launcher_icons` 已 `ios: false`）。
- 小部件实现：**方案 A——Flutter 半透明速记路由**。小部件按钮经 `home_widget` 深链拉起 Flutter 的透明 `/quick` 路由，复用现有 Dio + token + repository 调云端 API，而非在 Kotlin 里重写一套 API 客户端。
- 复盘报表形态：**心情趋势图 + 时间线列表**，作为复盘模块下的独立页/标签（不并入现有「周/月总结」页）。
- 「添加」tab：移动端中间的「添加」由"直接弹任务表单"改为弹「新建任务 / 新建备忘」二选一，与小部件两个按钮对齐。

## 3. 现状事实（落地依据）

- 后端模块化，统一为 `models.py / routes.py / schemas.py / service.py`，在 `app/api/router.py` 挂载。
- 建表机制：**Alembic**（`backend/alembic/versions`）——新表需新增迁移。
- 任务模型 `Task`：`title`（必填 ≤500）、`description`、`quadrant`（默认 `neither`）、`status`（默认 `todo`）、`due_date` 等。
- 复盘模型 `DailyReview`：每用户每天唯一一条（`raw_content` / `mood` 1–5 / `ai_structured` / `ai_polished`）。`GET /reviews?start_date&end_date` 已支持日期范围查询。
- 移动端导航：5 个 tab（首页 / 任务 / 添加 / 专注 / 我的）；复盘、习惯、OKR、项目、设置挂在「我的」下。中间「添加」当前直接 `showModalBottomSheet(TaskFormSheet)`。
- 移动端复盘页 `reviews_screen.dart` 当前会 `ref.watch(pastReviewsProvider)` 并内联渲染「历史复盘」列表 —— 本次要移除。
- Flutter 依赖：`dio` / `flutter_riverpod` / `go_router` / `flutter_secure_storage` / `intl`；**无** `home_widget`（需新增）。
- 前端**无图表库**；StatsPage 用手写 SVG `path` 画图 —— 心情趋势图沿用手写 SVG，不引新依赖。

## 4. 详细设计

### 4.1 备忘录后端模块 `app/memos/`

`Memo` 表（新增 Alembic 迁移）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK→users.id | |
| `content` | Text, not null | 备忘正文 |
| `is_done` | bool, 默认 false | 两态：未处理/已完成 |
| `done_at` | DateTime, 可空 | 勾选完成时间 |
| `task_id` | UUID FK→tasks.id, 可空 | 转出的任务（转任务后写回） |
| `created_at` / `updated_at` | DateTime | server_default / onupdate |

Schemas：
- `MemoCreate { content: str }`
- `MemoUpdate { content?: str, is_done?: bool }`
- `MemoOut { id, user_id, content, is_done, done_at, task_id, created_at, updated_at }`
- `MemoConvert { quadrant?: Quadrant = neither, due_date?: date }`
- 转任务返回 `{ memo: MemoOut, task: TaskOut }`

路由（`prefix=/memos`，鉴权沿用 `get_current_username` + `_get_user_id` 模式）：
- `GET /memos?status=open|done|all`（默认 `open`，按 `created_at` 倒序）
- `POST /memos` 新建
- `PATCH /memos/{id}` 改内容 / 勾选完成（`is_done=true` 时设 `done_at`，置回 false 时清空）
- `DELETE /memos/{id}`
- `POST /memos/{id}/convert` → 用 memo `content`（截断 500）建 `Task`（`quadrant` 取入参或默认 `neither`，`status=todo`），将 memo `is_done=true` + `done_at` + `task_id` 写回，返回 memo 与 task

`service.py` 镜像 `reviews/service.py` 风格（异步、显式 user 过滤）。在 `router.py` 注册 `memos_router`，prefix `/memos`，tag `memos`。

测试（`backend/tests/test_memos.py`，pytest）：创建 / 列表筛选 / 改内容 / 勾选完成与 `done_at` / 删除 / 转任务（断言 memo 被标记完成且 `task_id` 指向新任务且任务 title 正确）。

### 4.2 备忘录 Web 端

- `frontend/src/api/memos.ts`：`fetchMemos({status})` / `createMemo` / `updateMemo` / `deleteMemo` / `convertMemo`。
- `frontend/src/types`：新增 `Memo` 类型。
- `frontend/src/pages/MemoboxPage.tsx`：
  - 顶部速记输入框（textarea + 保存，Cmd/Ctrl+Enter 或按钮提交即新建并清空）。
  - 筛选「未处理 / 全部」。
  - 列表项：内容、完成勾选（toggle `is_done`）、**转任务**（弹确认/可选象限后调 `convert`）、删除。
  - 沿用 ReviewsPage 的暗色卡片风格与 TanStack Query 缓存失效模式。
- 侧栏导航新增「速记」入口；`App.tsx` 增加 `/memos` 路由。

### 4.3 备忘录 移动端 `features/memos/`

- `memo_models.dart`（`Memo` + 状态/repository 结果模型）、`memo_repository.dart`（Dio 调 `/memos`）、`memo_provider.dart`（Riverpod，列表 + 筛选）、`memos_screen.dart`。
- `root_shell.dart`：中间「添加」tab 的 `_showQuickAdd` 改为弹「新建任务 / 新建备忘」二选一的 sheet；选任务→现有 `TaskFormSheet`，选备忘→新的 `MemoQuickAddSheet`（单输入框 + 保存）。
- `memos_screen`：列表 + 「未处理/全部」筛选；左滑完成 / 删除；条目「转任务」复用 `TaskFormSheet` 并预填 `content` 作为 title，保存成功后调 `convert`（或先建任务再标记 memo 完成，二选一在实现时统一为走后端 `convert` 接口）。
- 入口：首页加「速记收集箱」卡片/入口 +「我的」菜单加入口；`go_router` 增加 `/memos` 路由（归到「我的」tab 高亮）。

### 4.4 Android 桌面小部件（方案 A）

- 新增依赖 `home_widget`。
- Android 原生：`AppWidgetProvider`（Kotlin）+ RemoteViews 布局：标题 + 两个按钮「📝 备忘」「✓ 任务」。两个按钮分别绑定 `home_widget` 的点击 → 拉起 App 并带参（`type=memo` / `type=task`）。
- Flutter 侧：新增透明/半透明路由 `/quick`（`go_router`），根据参数显示备忘速记框或任务速记框；保存时复用 `MemoRepository` / `TaskRepository`（即复用 Dio + `flutter_secure_storage` 中的 token）调云端 API；保存成功后关闭页面（`SystemNavigator.pop()` 或 pop 回首页）。
- 启动接线：`home_widget` 的 `initiallyLaunchedFromHomeWidget` + `widgetClicked` 流，在 app 启动/恢复时读取并 `context.go('/quick?type=...')`。
- 鉴权：`/quick` 路由检测未登录 → 提示去登录（不静默失败）。
- 离线：保存失败时**保留已输入文字 + 显示错误可重试**；本地队列 + 自动同步列为**后续可选增强**，v1 不做。
- iOS：本次不做（`ios: false`）。

### 4.5 每日复盘改造

**复盘页瘦身（只看今天）**：
- 移动端 `reviews_screen.dart`：移除 `pastReviewsProvider` 的内联「历史复盘」列表与相关查询，页面只保留今日卡片（内容 + 心情 + AI 转换）。
- Web `ReviewsPage.tsx` 本就单日 + 前后日导航，保持现状（不查询历史列表）。

**新增复盘报表/历史**（心情趋势图 + 时间线列表）：
- 后端：复用 `GET /reviews?start_date&end_date`（已支持）。心情序列由前端从返回列表派生，**不新增后端接口**。
- Web：新增 `ReviewReportPage`（或复盘页内的「报表/历史」标签）：
  - 顶部心情趋势图：手写 SVG `polyline/path`（沿用 StatsPage 风格），可选时间范围（近 7/30 天或本月）。
  - 下方按日期倒序的复盘时间线，每项显示日期、心情 emoji、内容摘要；点开进入当天复盘详情（全文 + `ai_structured` + `ai_polished`）。
  - 侧栏/复盘页提供入口。
- 移动端：新增 `review_report_screen`（同款趋势 + 时间线），点任一天进当天复盘详情。`review_provider` 复用现有日期范围查询能力（原 `pastReviewsProvider` 的数据源迁移到报表页使用）。

## 5. 实施阶段（供后续 writing-plans 使用）

1. **Memo 后端**：模型 + Alembic 迁移 + schemas + service + routes + router 注册 + pytest。
2. **Memo Web**：api/memos.ts + 类型 + MemoboxPage + 侧栏/路由。
3. **Memo 移动端**：features/memos + 「添加」二选一 sheet + 首页/我的入口 + 路由。
4. **Android 小部件**：home_widget 依赖 + 原生 AppWidgetProvider/RemoteViews + Flutter `/quick` 透明路由 + 启动接线 + 鉴权/离线处理。
5. **复盘改造**：移动端复盘页瘦身；Web + 移动端复盘报表（趋势 + 时间线 + 详情）。

## 6. 非目标（YAGNI）

- 备忘录不做富文本/Markdown、标签、文件夹、提醒。
- 小部件不做信息统计展示、不做 iOS、不做 v1 离线队列。
- 复盘报表不新增后端聚合接口（前端从现有列表派生）；不改动周/月 AI 总结。

## 7. 风险与注意

- 小部件方案 A 有 Flutter 冷启动延迟（个人使用可接受）；需正确处理 app 已在后台/已被杀两种启动路径。
- 小部件速记离线丢失风险——v1 用"保留文字 + 可重试"缓解，明确告知为已知限制。
- 转任务统一走后端 `POST /memos/{id}/convert`，避免 Web/移动端各写一套"建任务+标记完成"逻辑导致漂移。
- Memo `content` 转 Task `title` 需截断到 500 字符（与 Task.title 长度约束一致）。
