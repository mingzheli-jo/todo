# 速记备忘录 + Android 桌面小部件 + 每日复盘改造 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 Toto 增加「速记收集箱」备忘录（后端+Web+移动端，可转任务）、Android 桌面小部件（快捷入口拉起轻量速记框）、以及每日复盘改造（复盘页只看今天 + 新增心情趋势报表页）。

**Architecture:** 后端新增 `app/memos/` 模块（FastAPI + async SQLAlchemy + Alembic 迁移），与现有 `reviews/tasks` 模块同构。Web 端新增 `MemoboxPage` 与复盘报表页。移动端新增 `features/memos/`，并通过 `home_widget` 让原生小部件深链拉起 Flutter 透明 `/quick` 路由，复用现有 Dio + token + repository 调云端 API。复盘报表复用现有 `GET /reviews?start&end`，心情趋势用手写 SVG。

**Tech Stack:** FastAPI / SQLAlchemy(async) / Alembic / pytest（后端）；React + TypeScript + TanStack Query + Tailwind + axios（Web）；Flutter + Riverpod + go_router + Dio + home_widget（移动端）；Kotlin AppWidgetProvider（Android 原生）。

**分支：** `feat/memo-widget-review-report`

**关键约定（来自现有代码）：**
- 后端每模块四件套 `models/schemas/service/routes`，路由用 `_get_user_id(username, db)` 解析用户，鉴权 `Depends(get_current_username)`。
- 测试：`backend/tests/conftest.py` 用 sqlite 内存库 + `Base.metadata.create_all`，并显式 `import app.<mod>.models` 注册到 metadata；登录用 `admin/admin123` 取 token。
- 移动端 app id / 包名：`online.azhefuye.toto`；`MainActivity` 在 `mobile/android/app/src/main/kotlin/online/azhefuye/toto/MainActivity.kt`。
- 移动端 API base：`https://todo.azhefuye.online/api`（`AppConstants.apiBaseUrl`）。

---

## 阶段 1：备忘录后端模块 `app/memos/`

### Task 1.1: Memo 模型

**Files:**
- Create: `backend/app/memos/__init__.py`
- Create: `backend/app/memos/models.py`

- [ ] **Step 1: 创建空包文件**

`backend/app/memos/__init__.py`：空文件。

- [ ] **Step 2: 写模型**

`backend/app/memos/models.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Memo(Base):
    __tablename__ = "memos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: 在测试 conftest 注册模型**

在 `backend/tests/conftest.py` 的模型导入块（`import app.feishu.models  # noqa: F401` 一行附近）追加一行：

```python
import app.memos.models  # noqa: F401
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/memos/__init__.py backend/app/memos/models.py backend/tests/conftest.py
git commit -m "feat(memos): add Memo model"
```

### Task 1.2: Memo schemas

**Files:**
- Create: `backend/app/memos/schemas.py`

- [ ] **Step 1: 写 schemas**

`backend/app/memos/schemas.py`:

```python
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.tasks_domain.models import Quadrant
from app.tasks_domain.schemas import TaskOut


class MemoCreate(BaseModel):
    content: str = Field(min_length=1)


class MemoUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    is_done: bool | None = None


class MemoConvert(BaseModel):
    quadrant: Quadrant = Quadrant.neither
    due_date: date | None = None


class MemoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    is_done: bool
    done_at: datetime | None
    task_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class MemoConvertOut(BaseModel):
    memo: MemoOut
    task: TaskOut
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/memos/schemas.py
git commit -m "feat(memos): add schemas"
```

### Task 1.3: Memo service

**Files:**
- Create: `backend/app/memos/service.py`

- [ ] **Step 1: 写 service**

`backend/app/memos/service.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.memos.models import Memo
from app.memos.schemas import MemoConvert, MemoCreate, MemoUpdate
from app.tasks_domain.models import Task, TaskStatus

TASK_TITLE_MAX = 500


async def list_memos(db: AsyncSession, user_id: uuid.UUID, status: str = "open") -> list[Memo]:
    stmt = select(Memo).where(Memo.user_id == user_id).order_by(Memo.created_at.desc())
    if status == "open":
        stmt = stmt.where(Memo.is_done.is_(False))
    elif status == "done":
        stmt = stmt.where(Memo.is_done.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_memo(db: AsyncSession, memo_id: uuid.UUID, user_id: uuid.UUID) -> Memo | None:
    result = await db.execute(select(Memo).where(Memo.id == memo_id, Memo.user_id == user_id))
    return result.scalar_one_or_none()


async def create_memo(db: AsyncSession, user_id: uuid.UUID, data: MemoCreate) -> Memo:
    memo = Memo(user_id=user_id, content=data.content)
    db.add(memo)
    await db.commit()
    await db.refresh(memo)
    return memo


async def update_memo(db: AsyncSession, memo: Memo, data: MemoUpdate) -> Memo:
    update_data = data.model_dump(exclude_unset=True)
    if "is_done" in update_data:
        if update_data["is_done"] and memo.done_at is None:
            memo.done_at = datetime.now(timezone.utc)
        elif not update_data["is_done"]:
            memo.done_at = None
    for key, value in update_data.items():
        setattr(memo, key, value)
    await db.commit()
    await db.refresh(memo)
    return memo


async def delete_memo(db: AsyncSession, memo: Memo) -> None:
    await db.delete(memo)
    await db.commit()


async def convert_to_task(db: AsyncSession, memo: Memo, data: MemoConvert) -> tuple[Memo, Task]:
    task = Task(
        user_id=memo.user_id,
        title=memo.content[:TASK_TITLE_MAX],
        quadrant=data.quadrant,
        status=TaskStatus.todo,
        due_date=data.due_date,
    )
    db.add(task)
    await db.flush()
    memo.is_done = True
    memo.done_at = datetime.now(timezone.utc)
    memo.task_id = task.id
    await db.commit()
    await db.refresh(memo)
    await db.refresh(task)
    return memo, task
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/memos/service.py
git commit -m "feat(memos): add service layer"
```

### Task 1.4: Memo routes + 注册

**Files:**
- Create: `backend/app/memos/routes.py`
- Modify: `backend/app/api/router.py`

- [ ] **Step 1: 写 routes**

`backend/app/memos/routes.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.memos import service
from app.memos.schemas import MemoConvert, MemoConvertOut, MemoCreate, MemoOut, MemoUpdate
from app.tasks_domain.schemas import TaskOut

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[MemoOut])
async def list_memos(
    status_filter: str = Query("open", alias="status", pattern="^(open|done|all)$"),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memos = await service.list_memos(db, user_id, status=status_filter)
    return [MemoOut.model_validate(m) for m in memos]


@router.post("", response_model=MemoOut, status_code=status.HTTP_201_CREATED)
async def create_memo(
    body: MemoCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.create_memo(db, user_id, body)
    return MemoOut.model_validate(memo)


@router.patch("/{memo_id}", response_model=MemoOut)
async def update_memo(
    memo_id: uuid.UUID,
    body: MemoUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    updated = await service.update_memo(db, memo, body)
    return MemoOut.model_validate(updated)


@router.delete("/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memo(
    memo_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    await service.delete_memo(db, memo)


@router.post("/{memo_id}/convert", response_model=MemoConvertOut)
async def convert_memo(
    memo_id: uuid.UUID,
    body: MemoConvert,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    updated_memo, task = await service.convert_to_task(db, memo, body)
    return MemoConvertOut(memo=MemoOut.model_validate(updated_memo), task=TaskOut.model_validate(task))
```

- [ ] **Step 2: 注册路由**

在 `backend/app/api/router.py`，import 区追加：

```python
from app.memos.routes import router as memos_router
```

并在 include 区追加（放在 reviews 之后即可）：

```python
api_router.include_router(memos_router, prefix="/memos", tags=["memos"])
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/memos/routes.py backend/app/api/router.py
git commit -m "feat(memos): add routes and register router"
```

### Task 1.5: Memo 测试

**Files:**
- Create: `backend/tests/test_memos.py`

- [ ] **Step 1: 写测试**

`backend/tests/test_memos.py`:

```python
import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_list_memo(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/memos", json={"content": "买牛奶"}, headers=_auth(token))
    assert resp.status_code == 201
    assert resp.json()["content"] == "买牛奶"
    assert resp.json()["is_done"] is False

    listed = await client.get("/api/memos", headers=_auth(token))
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_mark_done_sets_done_at(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "写周报"}, headers=_auth(token))
    memo_id = created.json()["id"]

    done = await client.patch(f"/api/memos/{memo_id}", json={"is_done": True}, headers=_auth(token))
    assert done.status_code == 200
    assert done.json()["is_done"] is True
    assert done.json()["done_at"] is not None

    # open filter should now exclude it
    open_list = await client.get("/api/memos?status=open", headers=_auth(token))
    assert len(open_list.json()) == 0
    all_list = await client.get("/api/memos?status=all", headers=_auth(token))
    assert len(all_list.json()) == 1


@pytest.mark.asyncio
async def test_delete_memo(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "临时"}, headers=_auth(token))
    memo_id = created.json()["id"]
    resp = await client.delete(f"/api/memos/{memo_id}", headers=_auth(token))
    assert resp.status_code == 204
    listed = await client.get("/api/memos?status=all", headers=_auth(token))
    assert len(listed.json()) == 0


@pytest.mark.asyncio
async def test_convert_memo_to_task(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "准备演讲稿"}, headers=_auth(token))
    memo_id = created.json()["id"]

    resp = await client.post(
        f"/api/memos/{memo_id}/convert",
        json={"quadrant": "important"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["title"] == "准备演讲稿"
    assert data["task"]["quadrant"] == "important"
    assert data["memo"]["is_done"] is True
    assert data["memo"]["task_id"] == data["task"]["id"]

    # the converted task should exist in tasks list
    tasks = await client.get("/api/tasks", headers=_auth(token))
    assert any(t["id"] == data["task"]["id"] for t in tasks.json())
```

- [ ] **Step 2: 运行测试，确认通过**

Run: `cd backend && python -m pytest tests/test_memos.py -v`
Expected: 4 passed。若失败先修实现，勿改测试（除非测试本身写错）。

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_memos.py
git commit -m "test(memos): cover crud, done-state, convert"
```

### Task 1.6: Alembic 迁移（生产建表）

**Files:**
- Create: `backend/alembic/versions/003_add_memos_table.py`

- [ ] **Step 1: 写迁移**

> 注意：现有 head 是 `002`。新迁移 `down_revision = "002"`。沿用 002 用 `op.f(...)` 命名约束的风格。memos 不引入新 enum。

`backend/alembic/versions/003_add_memos_table.py`:

```python
"""add memos table

Revision ID: 003
Revises: 002
Create Date: 2026-05-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "memos",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_done", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("task_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_memos_user_id_users")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_memos_task_id_tasks")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_memos")),
    )
    op.create_index(op.f("ix_memos_user_id"), "memos", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_memos_user_id"), table_name="memos")
    op.drop_table("memos")
```

- [ ] **Step 2: 校验迁移可应用（本地有 Postgres 时）**

Run: `cd backend && alembic upgrade head`
Expected: 无错误，`memos` 表创建。若本地无 Postgres，跳过执行但确保文件语法正确（`python -c "import ast; ast.parse(open('alembic/versions/003_add_memos_table.py').read())"`）。

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/003_add_memos_table.py
git commit -m "feat(memos): alembic migration for memos table"
```

---

## 阶段 2：备忘录 Web 端

### Task 2.1: Memo 类型与 API

**Files:**
- Modify: `frontend/src/types/index.ts`（若类型集中在此；否则 `frontend/src/types.ts`，先确认路径）
- Create: `frontend/src/api/memos.ts`

- [ ] **Step 1: 确认 types 文件路径**

Run: `ls frontend/src/types*` 或 `ls frontend/src/types`
找到导出 `DailyReview`/`Task` 的文件，下一步在该文件追加。

- [ ] **Step 2: 追加 Memo 类型**

在 types 文件追加：

```typescript
export interface Memo {
  id: string;
  user_id: string;
  content: string;
  is_done: boolean;
  done_at: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MemoStatusFilter = "open" | "done" | "all";
```

- [ ] **Step 3: 写 api/memos.ts**

`frontend/src/api/memos.ts`:

```typescript
import client from "./client";
import type { Memo, MemoStatusFilter, Task } from "../types";

export async function fetchMemos(status: MemoStatusFilter = "open"): Promise<Memo[]> {
  const resp = await client.get<Memo[]>("/memos", { params: { status } });
  return resp.data;
}

export async function createMemo(content: string): Promise<Memo> {
  const resp = await client.post<Memo>("/memos", { content });
  return resp.data;
}

export async function updateMemo(
  id: string,
  data: { content?: string; is_done?: boolean }
): Promise<Memo> {
  const resp = await client.patch<Memo>(`/memos/${id}`, data);
  return resp.data;
}

export async function deleteMemo(id: string): Promise<void> {
  await client.delete(`/memos/${id}`);
}

export async function convertMemo(
  id: string,
  data: { quadrant?: string; due_date?: string }
): Promise<{ memo: Memo; task: Task }> {
  const resp = await client.post<{ memo: Memo; task: Task }>(`/memos/${id}/convert`, data);
  return resp.data;
}
```

> 若 `Task` 类型未在 types 中导出，改为从 api 返回处用 `unknown` 不可行——请确认 `Task` 已导出（tasks.ts 使用过）；否则在 types 追加 `Task` 接口后再继续。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/memos.ts frontend/src/types*
git commit -m "feat(memos): web types and api client"
```

### Task 2.2: MemoboxPage + 路由 + 侧栏

**Files:**
- Create: `frontend/src/pages/MemoboxPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 写页面**

`frontend/src/pages/MemoboxPage.tsx`:

```tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMemos, createMemo, updateMemo, deleteMemo, convertMemo } from "../api/memos";
import type { Memo, MemoStatusFilter } from "../types";

export default function MemoboxPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MemoStatusFilter>("open");
  const [draft, setDraft] = useState("");

  const { data: memos = [], isLoading } = useQuery({
    queryKey: ["memos", filter],
    queryFn: () => fetchMemos(filter),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["memos"] });

  const createMut = useMutation({
    mutationFn: (content: string) => createMemo(content),
    onSuccess: () => { setDraft(""); invalidate(); },
  });
  const toggleMut = useMutation({
    mutationFn: (m: Memo) => updateMemo(m.id, { is_done: !m.is_done }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMemo(id),
    onSuccess: invalidate,
  });
  const convertMut = useMutation({
    mutationFn: (id: string) => convertMemo(id, { quadrant: "neither" }),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const submit = () => {
    const text = draft.trim();
    if (text && !createMut.isPending) createMut.mutate(text);
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="text-xl font-bold">🗒️ 速记收集箱</h1>
        <div className="flex gap-1.5">
          {(["open", "all"] as MemoStatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filter === f ? "bg-brand/20 text-purple-300" : "bg-white/[0.05] text-white/50 hover:text-white/80"
              }`}
            >
              {f === "open" ? "未处理" : "全部"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
            placeholder="随手记点什么…… (Ctrl/Cmd + Enter 保存)"
            rows={3}
            className="w-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder:text-white/20"
          />
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={createMut.isPending || !draft.trim()}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold disabled:opacity-40"
            >
              记一条
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : memos.length === 0 ? (
          <div className="text-center text-white/30 py-20">暂无备忘</div>
        ) : (
          <ul className="space-y-2">
            {memos.map((m) => (
              <li
                key={m.id}
                className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06] flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={m.is_done}
                  onChange={() => toggleMut.mutate(m)}
                  className="mt-1 accent-brand"
                />
                <span className={`flex-1 text-sm whitespace-pre-wrap ${m.is_done ? "text-white/30 line-through" : "text-white/80"}`}>
                  {m.content}
                </span>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!m.is_done && (
                    <button
                      onClick={() => convertMut.mutate(m.id)}
                      disabled={convertMut.isPending}
                      className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/60 text-xs"
                      title="转为任务"
                    >
                      转任务
                    </button>
                  )}
                  <button
                    onClick={() => deleteMut.mutate(m.id)}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-red-500/20 text-white/60 hover:text-red-300 text-xs"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: 注册路由**

`frontend/src/App.tsx`：import 区加 `import MemoboxPage from "./pages/MemoboxPage";`，并在内层 `<Routes>` 加：

```tsx
<Route path="/memos" element={<MemoboxPage />} />
```

- [ ] **Step 3: 侧栏加入口**

`frontend/src/components/layout/Sidebar.tsx`：在「个人成长」分组 `items` 数组顶部加一项：

```tsx
{ icon: "🗒️", name: "速记收集箱", path: "/memos" },
```

- [ ] **Step 4: 构建校验**

Run: `cd frontend && npm run build`
Expected: 构建通过，无 TS 错误。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MemoboxPage.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(memos): web memobox page, route, sidebar entry"
```

---

## 阶段 3：备忘录 移动端

### Task 3.1: Memo 模型与 repository

**Files:**
- Create: `mobile/lib/features/memos/memo_models.dart`
- Create: `mobile/lib/features/memos/memo_repository.dart`

- [ ] **Step 1: 写模型**

`mobile/lib/features/memos/memo_models.dart`:

```dart
class Memo {
  const Memo({
    required this.id,
    required this.content,
    required this.isDone,
    this.doneAt,
    this.taskId,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String content;
  final bool isDone;
  final DateTime? doneAt;
  final String? taskId;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Memo.fromJson(Map<String, dynamic> json) {
    return Memo(
      id: json['id'] as String,
      content: json['content'] as String? ?? '',
      isDone: json['is_done'] as bool? ?? false,
      doneAt: json['done_at'] == null ? null : DateTime.parse(json['done_at'] as String),
      taskId: json['task_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

enum MemoFilter { open, all }
```

- [ ] **Step 2: 写 repository**

`mobile/lib/features/memos/memo_repository.dart`:

```dart
import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/memos/memo_models.dart';

class MemoRepository {
  const MemoRepository(this._client);
  final DioClient _client;

  Future<List<Memo>> list({MemoFilter filter = MemoFilter.open}) async {
    final status = filter == MemoFilter.open ? 'open' : 'all';
    final response = await _client.get<List<dynamic>>('/memos', query: {'status': status});
    final items = response.data ?? const [];
    return items.map((e) => Memo.fromJson(e as Map<String, dynamic>)).toList(growable: false);
  }

  Future<Memo> create(String content) async {
    final response = await _client.post<Map<String, dynamic>>('/memos', data: {'content': content});
    return Memo.fromJson(response.data!);
  }

  Future<Memo> setDone(String id, bool isDone) async {
    final response = await _client.patch<Map<String, dynamic>>('/memos/$id', data: {'is_done': isDone});
    return Memo.fromJson(response.data!);
  }

  Future<void> delete(String id) async {
    await _client.delete<dynamic>('/memos/$id');
  }

  Future<void> convert(String id, {String quadrant = 'neither'}) async {
    await _client.post<Map<String, dynamic>>('/memos/$id/convert', data: {'quadrant': quadrant});
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/memos/memo_models.dart mobile/lib/features/memos/memo_repository.dart
git commit -m "feat(memos): mobile models and repository"
```

### Task 3.2: Memo provider 与列表页

**Files:**
- Create: `mobile/lib/features/memos/memo_provider.dart`
- Create: `mobile/lib/features/memos/memos_screen.dart`

- [ ] **Step 1: 写 provider**

`mobile/lib/features/memos/memo_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/memos/memo_models.dart';
import 'package:toto/features/memos/memo_repository.dart';

final memoRepositoryProvider = Provider<MemoRepository>((ref) {
  return MemoRepository(ref.watch(dioClientProvider));
});

final memoFilterProvider = StateProvider<MemoFilter>((ref) => MemoFilter.open);

final memoListProvider = FutureProvider<List<Memo>>((ref) async {
  final repo = ref.watch(memoRepositoryProvider);
  final filter = ref.watch(memoFilterProvider);
  return repo.list(filter: filter);
});
```

> 校验：`dioClientProvider` 来自 `core/auth/auth_provider.dart`（reviews 模块同样这样引用）。

- [ ] **Step 2: 写列表页**

`mobile/lib/features/memos/memos_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/memos/memo_models.dart';
import 'package:toto/features/memos/memo_provider.dart';

class MemosScreen extends ConsumerWidget {
  const MemosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(memoFilterProvider);
    final memos = ref.watch(memoListProvider);
    final repo = ref.read(memoRepositoryProvider);

    Future<void> refresh() async => ref.invalidate(memoListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('速记收集箱'),
        actions: [
          PopupMenuButton<MemoFilter>(
            initialValue: filter,
            onSelected: (f) => ref.read(memoFilterProvider.notifier).state = f,
            itemBuilder: (_) => const [
              PopupMenuItem(value: MemoFilter.open, child: Text('未处理')),
              PopupMenuItem(value: MemoFilter.all, child: Text('全部')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: memos.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text('加载失败，下拉重试'))]),
          data: (items) {
            if (items.isEmpty) {
              return ListView(children: const [Padding(padding: EdgeInsets.all(48), child: Center(child: Text('暂无备忘')))]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final m = items[i];
                return Dismissible(
                  key: ValueKey(m.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    color: Colors.red.withOpacity(0.2),
                    child: const Icon(Icons.delete_outline),
                  ),
                  onDismissed: (_) async {
                    await repo.delete(m.id);
                    ref.invalidate(memoListProvider);
                  },
                  child: Card(
                    child: ListTile(
                      leading: Checkbox(
                        value: m.isDone,
                        onChanged: (_) async {
                          await repo.setDone(m.id, !m.isDone);
                          ref.invalidate(memoListProvider);
                        },
                      ),
                      title: Text(
                        m.content,
                        style: TextStyle(
                          decoration: m.isDone ? TextDecoration.lineThrough : null,
                          color: m.isDone ? Theme.of(context).disabledColor : null,
                        ),
                      ),
                      trailing: m.isDone
                          ? null
                          : TextButton(
                              onPressed: () async {
                                await repo.convert(m.id);
                                ref.invalidate(memoListProvider);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('已转为任务')),
                                  );
                                }
                              },
                              child: const Text('转任务'),
                            ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/memos/memo_provider.dart mobile/lib/features/memos/memos_screen.dart
git commit -m "feat(memos): mobile provider and list screen"
```

### Task 3.3: 速记输入 sheet +「添加」二选一 + 路由/入口

**Files:**
- Create: `mobile/lib/features/memos/widgets/memo_quick_add_sheet.dart`
- Modify: `mobile/lib/shell/root_shell.dart`
- Modify: `mobile/lib/core/router.dart`

- [ ] **Step 1: 写速记 sheet**

`mobile/lib/features/memos/widgets/memo_quick_add_sheet.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/memos/memo_provider.dart';

class MemoQuickAddSheet extends ConsumerStatefulWidget {
  const MemoQuickAddSheet({super.key});

  @override
  ConsumerState<MemoQuickAddSheet> createState() => _MemoQuickAddSheetState();
}

class _MemoQuickAddSheetState extends ConsumerState<MemoQuickAddSheet> {
  final _controller = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(memoRepositoryProvider).create(text);
      ref.invalidate(memoListProvider);
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16, right: 16, top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('快速备忘', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            maxLines: 4,
            minLines: 2,
            decoration: const InputDecoration(hintText: '随手记点什么……', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving ? const Text('保存中…') : const Text('记一条'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: 「添加」改为二选一**

`mobile/lib/shell/root_shell.dart`：import 区加：

```dart
import 'package:toto/features/memos/widgets/memo_quick_add_sheet.dart';
```

将原 `_showQuickAdd` 方法替换为先弹二选一，再分别弹任务表单 / 备忘 sheet：

```dart
  void _showQuickAdd(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.task_alt_rounded),
              title: const Text('新建任务'),
              onTap: () {
                Navigator.of(context).pop();
                _openTaskForm(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.note_add_rounded),
              title: const Text('新建备忘'),
              onTap: () {
                Navigator.of(context).pop();
                _openMemoSheet(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openTaskForm(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const TaskFormSheet(),
    );
  }

  void _openMemoSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const MemoQuickAddSheet(),
    );
  }
```

- [ ] **Step 3: 路由 + profile/home 入口**

`mobile/lib/core/router.dart`：import 区加 `import 'package:toto/features/memos/memos_screen.dart';`，在 ShellRoute 的 routes 里加：

```dart
          GoRoute(
            path: '/memos',
            builder: (_, __) => const MemosScreen(),
          ),
```

并在 `root_shell.dart` 的 `_locationToIndex` 的 profile 高亮分支里把 `/memos` 加入（与 `/reviews` 同组）：

```dart
        location == '/memos' ||
```

在「我的」页 `mobile/lib/features/profile/profile_screen.dart` 找到跳转 `/reviews`/`/habits` 的列表项样式，照样加一项跳 `/memos`（标题「速记收集箱」，图标 `Icons.sticky_note_2_outlined`，`onTap: () => context.go('/memos')`，需 `import 'package:go_router/go_router.dart';`）。

- [ ] **Step 4: 静态分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error（warning 可接受）。

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/features/memos/ mobile/lib/shell/root_shell.dart mobile/lib/core/router.dart mobile/lib/features/profile/profile_screen.dart
git commit -m "feat(memos): mobile quick-add chooser, route, entries"
```

---

## 阶段 4：Android 桌面小部件（home_widget + 透明速记路由）

### Task 4.1: 加依赖 + Flutter 透明速记路由 `/quick`

**Files:**
- Modify: `mobile/pubspec.yaml`
- Create: `mobile/lib/features/quick_capture/quick_capture_screen.dart`
- Modify: `mobile/lib/core/router.dart`

- [ ] **Step 1: 加依赖**

`mobile/pubspec.yaml` 的 `dependencies:` 下加（对齐缩进，2 空格）：

```yaml
  home_widget: ^0.6.0
```

Run: `cd mobile && flutter pub get`
Expected: 解析成功。

- [ ] **Step 2: 写透明速记页**

`mobile/lib/features/quick_capture/quick_capture_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/memos/memo_provider.dart';

/// type: 'memo' | 'task' — 由桌面小部件深链传入
class QuickCaptureScreen extends ConsumerStatefulWidget {
  const QuickCaptureScreen({super.key, required this.type});
  final String type;

  @override
  ConsumerState<QuickCaptureScreen> createState() => _QuickCaptureScreenState();
}

class _QuickCaptureScreenState extends ConsumerState<QuickCaptureScreen> {
  final _controller = TextEditingController();
  bool _saving = false;

  bool get _isTask => widget.type == 'task';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _close() async {
    // 关闭并退回桌面
    await SystemNavigator.pop();
  }

  Future<void> _save() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      if (_isTask) {
        // 复用现有 Dio + token 直接建任务
        await ref.read(dioClientProvider).post<Map<String, dynamic>>(
          '/tasks',
          data: {'title': text},
        );
      } else {
        await ref.read(memoRepositoryProvider).create(text);
      }
      await _close();
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('保存失败，请检查网络后重试')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.4),
      body: GestureDetector(
        onTap: _close, // 点击空白处关闭
        child: Center(
          child: GestureDetector(
            onTap: () {}, // 吸收卡片内点击
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _isTask ? '快速新建任务' : '快速备忘',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    maxLines: 4,
                    minLines: 2,
                    decoration: InputDecoration(
                      hintText: _isTask ? '要做什么？' : '随手记点什么……',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      TextButton(onPressed: _close, child: const Text('取消')),
                      const Spacer(),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? '保存中…' : '保存'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: 注册 `/quick` 路由（在 ShellRoute 之外，无底栏）**

`mobile/lib/core/router.dart`：import 加 `import 'package:toto/features/quick_capture/quick_capture_screen.dart';`。在 `/login` 的 `GoRoute` 同级（即 `routes:` 顶层、ShellRoute 之外）加：

```dart
      GoRoute(
        path: '/quick',
        builder: (_, state) => QuickCaptureScreen(
          type: state.uri.queryParameters['type'] == 'task' ? 'task' : 'memo',
        ),
      ),
```

> 注意：redirect 逻辑已保证未登录会跳 `/login`，故 `/quick` 自动受保护。

- [ ] **Step 4: 分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error。

- [ ] **Step 5: Commit**

```bash
git add mobile/pubspec.yaml mobile/pubspec.lock mobile/lib/features/quick_capture/ mobile/lib/core/router.dart
git commit -m "feat(widget): home_widget dep + transparent /quick capture route"
```

### Task 4.2: home_widget 监听（启动/点击 → 导航 /quick）

**Files:**
- Modify: `mobile/lib/main.dart`

- [ ] **Step 1: 把 TotoApp 改为有状态以监听小部件点击**

替换 `mobile/lib/main.dart` 全文为：

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:home_widget/home_widget.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:toto/core/router.dart';
import 'package:toto/core/theme.dart';
import 'package:toto/core/theme_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('zh_CN');
  runApp(const ProviderScope(child: TotoApp()));
}

class TotoApp extends ConsumerStatefulWidget {
  const TotoApp({super.key});

  @override
  ConsumerState<TotoApp> createState() => _TotoAppState();
}

class _TotoAppState extends ConsumerState<TotoApp> {
  StreamSubscription<Uri?>? _widgetSub;

  @override
  void initState() {
    super.initState();
    _initWidgetLaunch();
  }

  Future<void> _initWidgetLaunch() async {
    // 冷启动：app 由小部件点击拉起
    final initialUri = await HomeWidget.initiallyLaunchedFromHomeWidget();
    _handleUri(initialUri);
    // 热启动：app 已在后台时点击小部件
    _widgetSub = HomeWidget.widgetClicked.listen(_handleUri);
  }

  void _handleUri(Uri? uri) {
    if (uri == null) return;
    final type = uri.host == 'task' ? 'task' : 'memo';
    // 等当前帧结束后再导航，确保 router 已就绪
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(routerProvider).go('/quick?type=$type');
    });
  }

  @override
  void dispose() {
    _widgetSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'Toto',
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      locale: const Locale('zh', 'CN'),
    );
  }
}
```

- [ ] **Step 2: 分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error。

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/main.dart
git commit -m "feat(widget): listen home_widget launch/click and route to /quick"
```

### Task 4.3: Android 原生小部件（RemoteViews + Provider + 注册）

**Files:**
- Create: `mobile/android/app/src/main/res/layout/toto_widget.xml`
- Create: `mobile/android/app/src/main/res/xml/toto_widget_info.xml`
- Create: `mobile/android/app/src/main/res/drawable/widget_background.xml`
- Create: `mobile/android/app/src/main/kotlin/online/azhefuye/toto/TotoWidgetProvider.kt`
- Modify: `mobile/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: 背景 drawable**

`mobile/android/app/src/main/res/drawable/widget_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1E1B2E" />
    <corners android:radius="20dp" />
</shape>
```

- [ ] **Step 2: 小部件布局**

`mobile/android/app/src/main/res/layout/toto_widget.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Toto 速记"
        android:textColor="#FFFFFF"
        android:textSize="13sp"
        android:textStyle="bold"
        android:paddingBottom="8dp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_memo_button"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginEnd="6dp"
            android:gravity="center"
            android:padding="12dp"
            android:text="📝 备忘"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:background="#6366F1" />

        <TextView
            android:id="@+id/widget_task_button"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="6dp"
            android:gravity="center"
            android:padding="12dp"
            android:text="✓ 任务"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:background="#8B5CF6" />
    </LinearLayout>
</LinearLayout>
```

- [ ] **Step 3: 小部件元信息**

`mobile/android/app/src/main/res/xml/toto_widget_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="80dp"
    android:targetCellWidth="3"
    android:targetCellHeight="1"
    android:resizeMode="horizontal"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/toto_widget" />
```

- [ ] **Step 4: Kotlin Provider**

`mobile/android/app/src/main/kotlin/online/azhefuye/toto/TotoWidgetProvider.kt`:

```kotlin
package online.azhefuye.toto

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.net.Uri
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetLaunchIntent

class TotoWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.toto_widget).apply {
                val memoIntent = HomeWidgetLaunchIntent.getActivity(
                    context, MainActivity::class.java, Uri.parse("totowidget://memo")
                )
                setOnClickPendingIntent(R.id.widget_memo_button, memoIntent)

                val taskIntent = HomeWidgetLaunchIntent.getActivity(
                    context, MainActivity::class.java, Uri.parse("totowidget://task")
                )
                setOnClickPendingIntent(R.id.widget_task_button, taskIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
```

> `es.antonborri.home_widget.HomeWidgetLaunchIntent` 来自 home_widget 包；`flutter pub get` + gradle 同步后可用。`MainActivity` 与本文件同包 `online.azhefuye.toto`。

- [ ] **Step 5: 注册 receiver**

`mobile/android/app/src/main/AndroidManifest.xml`：在 `<application>` 内、`MainActivity` 的 `</activity>` 之后、`flutterEmbedding` meta-data 之前，加：

```xml
        <receiver
            android:name=".TotoWidgetProvider"
            android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/toto_widget_info" />
        </receiver>
```

- [ ] **Step 6: 真机验证（小米 K40 已接好）**

Run: `cd mobile && flutter run -d <device-id>`
手动验证：
1. App 正常启动、登录。
2. 退到桌面，长按桌面 → 添加小部件 → 找到 Toto → 放置。
3. 点「📝 备忘」→ 应拉起半透明速记框 → 输入 → 保存 → 回桌面 → App 内「速记收集箱」可见该条。
4. 点「✓ 任务」→ 输入保存 → 任务列表出现该任务。
Expected: 两条路径都成功；保存失败时有「保存失败」提示且不丢输入。

- [ ] **Step 7: Commit**

```bash
git add mobile/android/app/src/main/res/ mobile/android/app/src/main/kotlin/online/azhefuye/toto/TotoWidgetProvider.kt mobile/android/app/src/main/AndroidManifest.xml
git commit -m "feat(widget): android appwidget provider, layout, manifest receiver"
```

---

## 阶段 5：每日复盘改造

### Task 5.1: 移动端复盘页瘦身（只看今天）

**Files:**
- Modify: `mobile/lib/features/reviews/reviews_screen.dart`

- [ ] **Step 1: 移除内联历史列表**

在 `reviews_screen.dart` 的 `build` 中：
- 删除 `final past = ref.watch(pastReviewsProvider);` 一行。
- 删除 `RefreshIndicator` 中「历史复盘」标题、`past.when(...)` 整段、其上方的 `Text('历史复盘', ...)` 与相邻 `SizedBox`，只保留 `_TodayCard(...)`。
- `onRefresh` 改为只刷新今日：删除 `ref.invalidate(pastReviewsProvider);` 一行，保留 `await ref.read(todayReviewProvider.notifier).load();`。
- 在 AppBar `actions` 增加一个「报表」入口按钮（跳转 `/review-report`，Task 5.2 创建）：

```dart
          IconButton(
            tooltip: '复盘报表',
            icon: const Icon(Icons.insights_outlined),
            onPressed: () => context.go('/review-report'),
          ),
```

需在文件顶部 import：

```dart
import 'package:go_router/go_router.dart';
```

- [ ] **Step 2: 分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error；`pastReviewsProvider` 若变为未使用会有 warning——保留它（Task 5.2 复用），或确认报表页已引用。

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/reviews/reviews_screen.dart
git commit -m "refactor(reviews): focus mobile review screen on today only"
```

### Task 5.2: 移动端复盘报表页（心情趋势 + 时间线 + 详情）

**Files:**
- Create: `mobile/lib/features/reviews/review_report_screen.dart`
- Modify: `mobile/lib/core/router.dart`
- Modify: `mobile/lib/shell/root_shell.dart`

- [ ] **Step 1: 写报表页（趋势用 CustomPaint，时间线用列表，点开看详情）**

`mobile/lib/features/reviews/review_report_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:toto/features/reviews/review_models.dart';
import 'package:toto/features/reviews/review_provider.dart';

const _moodEmojis = ['😢', '😕', '😐', '🙂', '😄'];

class ReviewReportScreen extends ConsumerWidget {
  const ReviewReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(pastReviewsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('复盘报表')),
      body: reviews.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('加载失败')),
        data: (items) {
          final sorted = [...items]..sort((a, b) => b.date.compareTo(a.date));
          final withMood = sorted.where((r) => r.mood != null).toList().reversed.toList();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('心情趋势', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              SizedBox(
                height: 120,
                child: withMood.length < 2
                    ? const Center(child: Text('数据不足'))
                    : CustomPaint(painter: _MoodTrendPainter(withMood), size: Size.infinite),
              ),
              const SizedBox(height: 24),
              Text('历史复盘', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...sorted.map((r) => Card(
                    child: ListTile(
                      leading: Text(
                        r.mood == null ? '·' : _moodEmojis[r.mood! - 1],
                        style: const TextStyle(fontSize: 22),
                      ),
                      title: Text(DateFormat('yyyy-MM-dd').format(r.date)),
                      subtitle: Text(
                        r.rawContent.isEmpty ? '（空）' : r.rawContent,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => _ReviewDetailScreen(review: r)),
                      ),
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}

class _MoodTrendPainter extends CustomPainter {
  _MoodTrendPainter(this.reviews);
  final List<Review> reviews;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final dot = Paint()..color = const Color(0xFFA78BFA);
    final n = reviews.length;
    final dx = n == 1 ? 0.0 : size.width / (n - 1);
    final path = Path();
    for (var i = 0; i < n; i++) {
      final mood = reviews[i].mood!; // 1..5
      final x = dx * i;
      final y = size.height - ((mood - 1) / 4) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 3, dot);
    }
    canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(covariant _MoodTrendPainter old) => old.reviews != reviews;
}

class _ReviewDetailScreen extends StatelessWidget {
  const _ReviewDetailScreen({required this.review});
  final Review review;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(DateFormat('yyyy-MM-dd').format(review.date))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (review.mood != null)
            Text('心情：${_moodEmojis[review.mood! - 1]}', style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 12),
          Text('原始复盘', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(review.rawContent.isEmpty ? '（空）' : review.rawContent),
          if (review.aiPolished != null && review.aiPolished!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('AI 润色', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(review.aiPolished!),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: 注册路由 + 高亮分组**

`mobile/lib/core/router.dart`：import 加 `import 'package:toto/features/reviews/review_report_screen.dart';`，在 ShellRoute routes 加：

```dart
          GoRoute(
            path: '/review-report',
            builder: (_, __) => const ReviewReportScreen(),
          ),
```

`mobile/lib/shell/root_shell.dart` 的 `_locationToIndex` profile 分组加 `location == '/review-report' ||`。

- [ ] **Step 3: 分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/features/reviews/review_report_screen.dart mobile/lib/core/router.dart mobile/lib/shell/root_shell.dart
git commit -m "feat(reviews): mobile review report (mood trend + timeline + detail)"
```

### Task 5.3: Web 复盘报表页（心情趋势 SVG + 时间线 + 详情）

**Files:**
- Create: `frontend/src/pages/ReviewReportPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 写报表页（手写 SVG 折线，沿用 StatsPage 风格）**

`frontend/src/pages/ReviewReportPage.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchReviews } from "../api/reviews";
import type { DailyReview } from "../types";

const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MoodTrend({ reviews }: { reviews: DailyReview[] }) {
  const points = reviews
    .filter((r) => r.mood != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < 2) {
    return <div className="text-white/30 text-sm py-8 text-center">数据不足以绘制趋势</div>;
  }
  const W = 600, H = 120, pad = 10;
  const dx = (W - pad * 2) / (points.length - 1);
  const coords = points.map((r, i) => {
    const x = pad + dx * i;
    const y = H - pad - ((r.mood! - 1) / 4) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
      <polyline points={coords.join(" ")} fill="none" stroke="#8B5CF6" strokeWidth="2" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r="3" fill="#A78BFA" />;
      })}
    </svg>
  );
}

export default function ReviewReportPage() {
  const [range, setRange] = useState(30);
  const [selected, setSelected] = useState<DailyReview | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["review-report", range],
    queryFn: () => fetchReviews({ start_date: daysAgo(range), end_date: daysAgo(0) }),
  });

  const sorted = [...reviews].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 复盘报表</h1>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                range === r ? "bg-brand/20 text-purple-300" : "bg-white/[0.05] text-white/50 hover:text-white/80"
              }`}
            >
              近 {r} 天
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-5">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">心情趋势</div>
          {isLoading ? <div className="text-white/30 text-sm py-8 text-center">加载中...</div> : <MoodTrend reviews={reviews} />}
        </div>

        <div className="space-y-2">
          {sorted.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06] hover:bg-white/[0.05] flex items-center gap-3"
            >
              <span className="text-2xl">{r.mood == null ? "·" : MOOD_EMOJIS[r.mood - 1]}</span>
              <span className="font-mono text-xs text-white/50 w-24">{r.date}</span>
              <span className="flex-1 text-sm text-white/70 truncate">{r.raw_content || "（空）"}</span>
            </button>
          ))}
          {!isLoading && sorted.length === 0 && (
            <div className="text-center text-white/30 py-20">该区间暂无复盘</div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface-raised rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{selected.date} {selected.mood != null && MOOD_EMOJIS[selected.mood - 1]}</h2>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">原始复盘</div>
            <p className="text-sm text-white/75 whitespace-pre-wrap mb-4">{selected.raw_content || "（空）"}</p>
            {selected.ai_polished && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">AI 润色</div>
                <p className="text-sm text-white/75 whitespace-pre-wrap">{selected.ai_polished}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: 注册路由 + 侧栏**

`frontend/src/App.tsx`：import `import ReviewReportPage from "./pages/ReviewReportPage";`，路由加 `<Route path="/review-report" element={<ReviewReportPage />} />`。

`frontend/src/components/layout/Sidebar.tsx`：在「个人成长」分组、`每日复盘` 之后加：

```tsx
{ icon: "📊", name: "复盘报表", path: "/review-report" },
```

- [ ] **Step 3: 构建校验**

Run: `cd frontend && npm run build`
Expected: 通过。若 `bg-surface-raised` 类不存在，改用 `bg-[#1E1B2E]` 或确认 tailwind 配置中的 surface token（Sidebar 用到了 `from-surface-raised`，应已定义）。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ReviewReportPage.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(reviews): web review report page (mood trend + timeline + detail)"
```

---

## 收尾验证

### Task 6.1: 全量校验

- [ ] **Step 1: 后端测试**

Run: `cd backend && python -m pytest -q`
Expected: 全绿（含新增 test_memos.py）。

- [ ] **Step 2: 前端构建**

Run: `cd frontend && npm run build`
Expected: 通过。

- [ ] **Step 3: 移动端分析**

Run: `cd mobile && flutter analyze`
Expected: 无 error。

- [ ] **Step 4: 真机冒烟**

Run: `cd mobile && flutter run -d <device-id>`
覆盖：备忘新建/勾选/转任务、添加二选一、小部件两按钮、复盘页只剩今日、复盘报表趋势+详情。

- [ ] **Step 5: 合并/PR**

按需创建 PR（base `master`）。

---

## 实施备注

- **DRY：** 转任务一律走后端 `POST /memos/{id}/convert`，Web/移动端不各写一套建任务+标记逻辑。
- **YAGNI：** 不做富文本、标签、提醒、iOS 小部件、离线队列。
- **TDD：** 后端 memo 走「先写测试→跑红→实现→跑绿」；本计划把测试集中在 Task 1.5（模型/服务/路由就绪后），实现时可按 TDD 顺序：先写 1.5 测试看失败，再回填 1.1–1.4。
- **数据自动同步：** 备忘/复盘均服务端存储，Web 与移动端通过同一云端 API 自然一致。
- **离线限制（小部件速记）：** 保存失败保留输入并提示，v1 已知限制，非目标内做本地队列。
