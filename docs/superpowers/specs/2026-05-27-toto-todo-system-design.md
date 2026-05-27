# Toto — 个人智能 To-Do 与复盘系统设计

> 日期: 2026-05-27
> 状态: 设计完成，待实现

## 1. 系统概述

Toto 是一个个人智能任务管理与复盘系统，集成四象限法则、PDCA 循环、OKR 目标管理、每日复盘 AI 转换、习惯打卡、番茄钟等功能。支持 PC Web 端和安卓 App（Flutter），通过同一套 REST API 实现双端数据同步。

### 1.1 核心理念

- **四象限法则**：所有任务按"紧急/重要"二维分类，聚焦真正重要的事
- **PDCA 循环**：项目级别的 Plan→Do→Check→Act 迭代闭环
- **AI 驱动复盘**：每日自由书写 → AI 结构化提取 + 润色 → 周/月汇总自动生成
- **多维视图**：同一份数据支持四象限、看板、时间线、列表四种视角

### 1.2 用户模型

个人为主，数据模型预留 `user_id` 字段，支持未来扩展为多用户系统。当前阶段为单管理员模式（JWT 认证）。

## 2. 技术架构

### 2.1 架构模式

单体 API + 双前端（方案 A），和参考项目 `personal/wechat-batch-rewriter` 保持一致。

### 2.2 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic |
| 任务队列 | Celery + Redis (Broker) + Celery Beat (定时调度) |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| PC 前端 | React 19 + Vite + Tailwind CSS + TanStack Query v5 |
| 移动端 | Flutter + Dart + Material 3 + Riverpod |
| 认证 | JWT (python-jose) + bcrypt |
| AI 集成 | OpenAI SDK (兼容 DeepSeek / Kimi / ChatGPT 等) |
| 部署 | Docker Compose + Caddy (HTTPS) + Nginx (SPA) |

### 2.3 服务编排

7 个 Docker 服务：

| 服务 | 镜像/职责 |
|------|----------|
| postgres | PostgreSQL 16 Alpine — 主数据库 |
| redis | Redis 7 Alpine — Celery Broker + 缓存 |
| api | FastAPI + Uvicorn :8000 — REST API 主服务 |
| worker | Celery Worker — AI 转换、汇总生成、飞书推送 |
| beat | Celery Beat — 定时调度（周汇总、月汇总） |
| web | Nginx + React SPA — PC 前端静态服务 + API 反代 |
| caddy | Caddy — HTTPS 自动证书（生产环境） |

### 2.4 API 模块

| 路径 | 职责 |
|------|------|
| `/api/auth` | 登录、JWT 刷新 |
| `/api/tasks` | 任务 CRUD、四象限分类、批量操作 |
| `/api/projects` | 项目管理、PDCA 阶段推进 |
| `/api/reviews` | 每日复盘 CRUD、触发 AI 转换 |
| `/api/summaries` | 周/月汇总查看、手动触发生成 |
| `/api/okrs` | OKR 目标与关键结果 CRUD |
| `/api/habits` | 习惯定义、每日打卡记录 |
| `/api/pomodoro` | 番茄钟会话创建、完成、统计 |
| `/api/settings` | AI Provider 配置、飞书推送配置 |
| `/api/stats` | 仪表盘统计数据聚合 |

## 3. 数据模型

### 3.1 核心任务管理

**User**
- `id` UUID PK
- `username` VARCHAR UNIQUE
- `email` VARCHAR
- `password_hash` VARCHAR
- `avatar_url` VARCHAR NULL
- `settings` JSONB (偏好配置)
- `created_at` TIMESTAMP

**Task**
- `id` UUID PK
- `user_id` FK → User
- `project_id` FK → Project NULL
- `title` VARCHAR
- `description` TEXT NULL
- `quadrant` ENUM: `urgent_important` / `important` / `urgent` / `neither`
- `status` ENUM: `todo` / `in_progress` / `done` / `cancelled`
- `priority` INT (象限内排序)
- `due_date` DATE NULL
- `tags` VARCHAR[] (PostgreSQL 数组)
- `sort_order` INT
- `completed_at` TIMESTAMP NULL
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Project**
- `id` UUID PK
- `user_id` FK → User
- `name` VARCHAR
- `description` TEXT NULL
- `color` VARCHAR (Hex)
- `icon` VARCHAR (emoji)
- `pdca_phase` ENUM: `plan` / `do` / `check` / `act`
- `pdca_cycle` INT DEFAULT 1 (第几轮循环)
- `is_archived` BOOL DEFAULT false
- `created_at` TIMESTAMP

**PDCALog**
- `id` UUID PK
- `project_id` FK → Project
- `cycle` INT
- `phase` ENUM: `plan` / `do` / `check` / `act`
- `content` TEXT (该阶段内容记录)
- `outcome` TEXT NULL (该阶段成果/结论)
- `created_at` TIMESTAMP

### 3.2 复盘与 AI 汇总

**DailyReview**
- `id` UUID PK
- `user_id` FK → User
- `date` DATE UNIQUE(per user)
- `raw_content` TEXT (用户原始输入)
- `ai_structured` JSONB NULL (结构化提取结果)
- `ai_polished` TEXT NULL (润色后文章)
- `mood` INT NULL (1-5 心情指数)
- `ai_task_id` VARCHAR NULL (Celery 任务 ID，用于轮询状态)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**AISummary**
- `id` UUID PK
- `user_id` FK → User
- `type` ENUM: `weekly` / `monthly`
- `period_start` DATE
- `period_end` DATE
- `content` TEXT (AI 生成的汇总内容)
- `metrics` JSONB (统计数据：任务完成数、番茄钟数、习惯完成率等)
- `pushed_feishu` BOOL DEFAULT false
- `created_at` TIMESTAMP

### 3.3 OKR 目标管理

**OKR**
- `id` UUID PK
- `user_id` FK → User
- `parent_id` FK → OKR NULL (O→KR 父子关系)
- `type` ENUM: `objective` / `key_result`
- `title` VARCHAR
- `description` TEXT NULL
- `period` VARCHAR (如 `2026-Q2`、`2026`)
- `progress` INT DEFAULT 0 (0-100)
- `status` ENUM: `active` / `completed` / `cancelled`
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**TaskOKRLink** (关联表)
- `task_id` FK → Task
- `okr_id` FK → OKR
- PK: (task_id, okr_id)

### 3.4 习惯打卡

**Habit**
- `id` UUID PK
- `user_id` FK → User
- `name` VARCHAR
- `icon` VARCHAR (emoji)
- `color` VARCHAR (Hex)
- `frequency` ENUM: `daily` / `weekday` / `weekly`
- `target_count` INT DEFAULT 1
- `is_active` BOOL DEFAULT true
- `created_at` TIMESTAMP

**HabitRecord**
- `id` UUID PK
- `habit_id` FK → Habit
- `date` DATE
- `completed` BOOL
- `note` TEXT NULL
- UNIQUE(habit_id, date)

### 3.5 番茄钟

**PomodoroSession**
- `id` UUID PK
- `user_id` FK → User
- `task_id` FK → Task NULL (可选绑定任务)
- `duration_min` INT DEFAULT 25
- `started_at` TIMESTAMP
- `completed_at` TIMESTAMP NULL
- `interrupted` BOOL DEFAULT false

### 3.6 系统配置

**AIProvider**
- `id` UUID PK
- `name` VARCHAR (显示名称，如 "DeepSeek")
- `base_url` VARCHAR
- `api_key_enc` VARCHAR (Fernet 加密)
- `model_name` VARCHAR
- `is_default` BOOL DEFAULT false
- `created_at` TIMESTAMP

**FeishuConfig**
- `id` UUID PK
- `user_id` FK → User
- `webhook_url` VARCHAR
- `push_weekly` BOOL DEFAULT true
- `push_monthly` BOOL DEFAULT true
- `push_hour` INT DEFAULT 9 (推送时间，24h 制)
- `created_at` TIMESTAMP

## 4. AI 处理流程

### 4.1 每日复盘 AI 转换

1. 用户写完复盘，点击「AI 智能转换」
2. API 创建 Celery 异步任务，返回 `task_id`，前端进入等待状态
3. Celery Worker 执行两个 LLM 调用：
   - **Prompt A（结构化提取）**：从自由文字中提取已完成事项、进行中任务、明日计划、问题/反思、健康状态等结构化字段，输出 JSON
   - **Prompt B（润色整理）**：将随意记录整理为通顺、条理清晰的复盘日记
4. 结果写回 `DailyReview` 表的 `ai_structured` 和 `ai_polished` 字段
5. 前端轮询 `/api/reviews/{id}/ai-status` 获取完成状态，显示结果

### 4.2 周/月汇总自动生成

1. **Celery Beat 定时触发**：
   - 每周一凌晨生成上周汇总
   - 每月 1 日凌晨生成上月汇总
2. **数据聚合**：
   - 该周期所有 `DailyReview.ai_structured`
   - Task 完成统计（按象限、项目分组）
   - Habit 打卡数据（完成率、最长连续天数）
   - PomodoroSession 统计（总数、总时长）
   - OKR 进度变化
3. **LLM 生成汇总**：将聚合数据作为 context，生成包含统计概览 + 亮点回顾 + 改进建议的汇总报告
4. **存储 + 推送**：结果写入 `AISummary` 表，若 `FeishuConfig.push_weekly/monthly` 为 true，通过 Webhook 推送到飞书群

### 4.3 飞书推送格式

使用飞书群机器人 Webhook（POST JSON），发送富文本卡片消息，包含：
- 周期标题（如「第 22 周工作汇总」）
- 关键数据指标
- AI 生成的汇总文字
- 链接回 Web 系统查看详情

## 5. PC Web 端设计

### 5.1 整体布局

三栏布局：左侧导航 + 中间主区域 + 右侧面板

### 5.2 左侧导航

分三组：
- **工作台**：任务看板、时间线、项目、OKR 目标
- **个人成长**：每日复盘、周/月汇总、习惯打卡、番茄钟
- **系统**：AI 配置、飞书推送、设置

### 5.3 任务看板（主视图）

支持四种视图切换，共用顶部 Tab：
- **四象限视图**：2×2 网格，每象限显示任务卡片，拖拽可移动象限
- **看板视图**：Kanban 三列（待办→进行中→已完成），拖拽推进状态
- **时间线视图**：按日期/周展示任务甘特图
- **列表视图**：表格形式，支持排序/筛选

### 5.4 任务卡片

展示：标题、复选框、所属项目标签、截止日期、关联 OKR、番茄钟计数

### 5.5 右侧面板

固定展示当日快捷信息：
- 番茄钟计时器（圆环进度 + 关联任务）
- 今日习惯打卡（进度条 + 连续天数）
- 今日统计（完成数、待处理、番茄钟数、习惯完成率）

### 5.6 设计风格

- 深色主题（#0a0a0f 基底）+ 紫色品牌色（#6366f1 → #8b5cf6）
- 四象限颜色：红（紧急重要）/ 黄（重要不急）/ 蓝（紧急不重要）/ 灰（都不）
- 渐变光效 + 微动画 hover 交互
- 卡片式 UI，圆角 10-14px

## 6. 安卓 App 设计

### 6.1 技术选型

Flutter + Dart + Material 3 + Riverpod 状态管理

### 6.2 底部导航

5 个 Tab：首页 / 任务 / ➕快速添加(FAB) / 专注 / 我的

### 6.3 首页

- 问候语 + 今日统计卡片横向滚动
- 四象限缩略网格
- 今日习惯打卡卡片

### 6.4 任务页

- 支持四象限 / 看板 / 列表视图切换
- 任务卡片展示同 PC 端
- 滑动操作：左滑完成、右滑编辑

### 6.5 专注页（番茄钟）

- 大圆环倒计时 + 紫色渐变光晕
- 关联当前任务
- 播放/暂停/跳过/结束控制
- 今日番茄数 / 专注时长 / 完成率统计

### 6.6 我的页

- 每日复盘入口（日期导航 + 心情选择 + 编辑器 + AI 转换）
- 周/月汇总查看
- OKR 目标管理
- 项目 & PDCA 管理
- AI 配置、飞书配置、个人设置

### 6.7 桌面 Widget

三种 Widget：
- **今日待办**（4×2）：显示前 3 条紧急任务
- **番茄钟**（2×2）：今日番茄数
- **习惯打卡**（2×2）：今日完成进度

### 6.8 功能对等

App 与 PC Web 端功能完全一致，仅布局和交互方式适配移动端。

## 7. 部署方案

### 7.1 开发环境

```bash
docker compose up -d
# 启动: postgres, redis, api, worker, beat, web
# API: http://localhost:8000
# Web: http://localhost:80
```

### 7.2 生产环境

```bash
./deploy.sh
# 叠加 docker-compose.prod.yml
# 添加 Caddy HTTPS, restart 策略
# 自动运行 Alembic 迁移
# 健康检查验证
```

### 7.3 部署脚本 (deploy.sh)

复用参考项目模式：
1. 校验 `.env` 必需变量（DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, DOMAIN）
2. `git pull`（如有 .git）
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml build`
4. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
5. 等待 API `/health` 返回 200
6. 输出访问 URL

### 7.4 备份脚本 (backup.sh)

- PostgreSQL `pg_dump` 压缩备份
- `.env` 归档（保护 ENCRYPTION_KEY）
- 30 天自动清理旧备份

### 7.5 Flutter App 构建

```bash
cd mobile
flutter build apk --release
# 输出: build/app/outputs/flutter-apk/app-release.apk
```

## 8. 环境变量

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/toto
POSTGRES_DB=toto
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_URL=redis://redis:6379/0

# 认证
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
JWT_SECRET=<64-char-hex>

# 加密
ENCRYPTION_KEY=<fernet-key>

# AI (默认配置，可在系统中动态管理)
DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_BASE_URL=https://api.deepseek.com/v1
DEFAULT_AI_API_KEY=<key>
DEFAULT_AI_MODEL=deepseek-chat

# Celery
CELERY_WORKER_CONCURRENCY=2

# 部署
DOMAIN=toto.example.com
```

## 9. 项目目录结构

```
toto/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── auth/                # JWT 认证
│   │   ├── tasks/               # 任务管理模块
│   │   ├── projects/            # 项目 & PDCA 模块
│   │   ├── reviews/             # 每日复盘模块
│   │   ├── summaries/           # AI 汇总模块
│   │   ├── okrs/                # OKR 目标模块
│   │   ├── habits/              # 习惯打卡模块
│   │   ├── pomodoro/            # 番茄钟模块
│   │   ├── ai_providers/        # AI Provider 管理
│   │   ├── feishu/              # 飞书推送模块
│   │   ├── stats/               # 统计聚合
│   │   ├── db/                  # SQLAlchemy models & session
│   │   └── celery_tasks/        # Celery 任务定义
│   ├── alembic/                 # 数据库迁移
│   ├── tests/                   # 测试
│   └── pyproject.toml           # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── components/          # 通用组件
│   │   ├── pages/               # 页面
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── api/                 # API 调用层
│   │   ├── stores/              # 状态管理
│   │   └── styles/              # 全局样式/tokens
│   ├── package.json
│   └── vite.config.ts
├── mobile/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/              # 数据模型
│   │   ├── providers/           # Riverpod providers
│   │   ├── services/            # API 服务
│   │   ├── screens/             # 页面
│   │   ├── widgets/             # 通用组件
│   │   └── utils/               # 工具函数
│   └── pubspec.yaml
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.worker
│   ├── entrypoint-api.sh
│   ├── entrypoint-worker.sh
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── deploy.sh
├── backup.sh
├── Caddyfile
├── .env.example
└── README.md
```

## 10. 实现分期

### Phase 1: 基础骨架（MVP）
- 后端项目初始化 + 数据库模型 + 认证
- 任务 CRUD + 四象限
- PC 前端骨架 + 四象限视图
- Docker 部署脚本

### Phase 2: 复盘与 AI
- 每日复盘 CRUD
- AI 转换（结构化提取 + 润色）
- Celery Worker 异步处理
- AI Provider 系统配置页

### Phase 3: 项目 & PDCA
- 项目管理 CRUD
- PDCA 阶段推进 + PDCALog 记录
- 任务关联项目

### Phase 4: OKR & 习惯 & 番茄钟
- OKR 目标管理（O→KR 层级）
- 习惯定义 + 每日打卡
- 番茄钟会话（绑定任务）

### Phase 5: 汇总与推送
- 周/月汇总 Celery Beat 定时生成
- 飞书 Webhook 推送
- 汇总查看页面

### Phase 6: 多视图
- 看板视图（拖拽）
- 时间线视图
- 列表视图
- 视图切换 Tab

### Phase 7: Flutter App
- Flutter 项目初始化
- 首页（四象限缩略 + 习惯 + 统计）
- 任务管理页
- 番茄钟页
- 复盘 & AI 页
- 桌面 Widget

### Phase 8: 打磨
- 数据统计仪表盘
- 深色/浅色主题切换
- 离线缓存（Flutter）
- 备份脚本
- 性能优化
