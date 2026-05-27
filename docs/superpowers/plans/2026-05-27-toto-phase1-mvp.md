# Toto Phase 1: MVP — 基础骨架实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working MVP with backend API (auth + task CRUD + four-quadrant classification), PC frontend (quadrant view), and Docker deployment — the foundation for all subsequent phases.

**Architecture:** Single FastAPI backend serving REST API, React+Vite frontend served via Nginx, PostgreSQL for data, Redis for future Celery integration. Docker Compose orchestrates all services. Follows the exact patterns from the reference project at `D:\ide\workspace\personal`.

**Tech Stack:** Python 3.12 / FastAPI / SQLAlchemy 2.0 async / Alembic / PostgreSQL 16 / Redis 7 / React 19 / Vite / Tailwind CSS / TanStack Query v5 / Docker Compose / Caddy

**Spec:** `docs/superpowers/specs/2026-05-27-toto-todo-system-design.md`

**Scope:** Phase 1 only. Phases 2-8 will get separate plans after Phase 1 is verified working.

---

## File Map

### Backend (`backend/`)

| File | Responsibility |
|------|---------------|
| `pyproject.toml` | Python dependencies, ruff/mypy/pytest config |
| `alembic.ini` | Alembic config (sqlalchemy.url left blank) |
| `alembic/env.py` | Async migration runner, imports all models |
| `alembic/versions/` | Auto-generated migration files |
| `app/__init__.py` | Empty |
| `app/main.py` | `create_app()` factory, CORS, router mount, `/health` |
| `app/config.py` | `pydantic-settings` Settings + `lru_cache` |
| `app/db/__init__.py` | Empty |
| `app/db/base.py` | `DeclarativeBase` + naming convention metadata |
| `app/db/session.py` | Async engine factory, `get_session()` generator |
| `app/db/encryption.py` | Fernet `EncryptedString` TypeDecorator |
| `app/api/__init__.py` | Empty |
| `app/api/router.py` | Aggregates all domain routers |
| `app/api/deps.py` | `get_db` dependency wrapper |
| `app/auth/__init__.py` | Empty |
| `app/auth/models.py` | `User` ORM model |
| `app/auth/schemas.py` | `LoginRequest`, `TokenResponse`, `UserOut` |
| `app/auth/routes.py` | `/auth/login`, `/auth/me` |
| `app/auth/dependencies.py` | `get_current_username` FastAPI dependency |
| `app/auth/jwt_utils.py` | `create_access_token`, `decode_token` |
| `app/auth/password.py` | bcrypt `hash_password`, `verify_password` |
| `app/tasks_domain/__init__.py` | Empty (named `tasks_domain` to avoid collision with celery `tasks`) |
| `app/tasks_domain/models.py` | `Task` ORM model with quadrant enum |
| `app/tasks_domain/schemas.py` | `TaskCreate`, `TaskUpdate`, `TaskOut`, `TaskListParams` |
| `app/tasks_domain/service.py` | Task CRUD async functions |
| `app/tasks_domain/routes.py` | `/tasks` CRUD + filter-by-quadrant |
| `app/projects/__init__.py` | Empty |
| `app/projects/models.py` | `Project` ORM model with PDCA phase |
| `app/projects/schemas.py` | `ProjectCreate`, `ProjectUpdate`, `ProjectOut` |
| `app/projects/service.py` | Project CRUD async functions |
| `app/projects/routes.py` | `/projects` CRUD |
| `app/stats/__init__.py` | Empty |
| `app/stats/routes.py` | `/stats/today` dashboard stats |
| `tests/conftest.py` | Async test fixtures, test DB session |
| `tests/test_auth.py` | Auth endpoint tests |
| `tests/test_tasks.py` | Task CRUD + quadrant tests |
| `tests/test_projects.py` | Project CRUD tests |

### Frontend (`frontend/`)

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies |
| `vite.config.ts` | Vite config + API proxy |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Tailwind config with dark theme tokens |
| `postcss.config.js` | PostCSS + autoprefixer |
| `index.html` | HTML entry |
| `src/main.tsx` | React root, QueryClientProvider, BrowserRouter |
| `src/App.tsx` | Route tree, RequireAuth wrapper |
| `src/styles/globals.css` | Tailwind directives + CSS tokens |
| `src/api/client.ts` | Axios instance, token interceptor, 401 redirect |
| `src/api/auth.ts` | Login API call |
| `src/api/tasks.ts` | Task CRUD API calls |
| `src/api/projects.ts` | Project CRUD API calls |
| `src/api/stats.ts` | Stats API call |
| `src/hooks/useAuth.ts` | Auth state hook (token in localStorage) |
| `src/pages/LoginPage.tsx` | Login form |
| `src/pages/DashboardPage.tsx` | Main quadrant view page |
| `src/components/layout/Shell.tsx` | Three-column layout container |
| `src/components/layout/Sidebar.tsx` | Left navigation |
| `src/components/layout/RightPanel.tsx` | Right stats panel |
| `src/components/tasks/QuadrantGrid.tsx` | 2×2 quadrant grid |
| `src/components/tasks/QuadrantColumn.tsx` | Single quadrant with task list |
| `src/components/tasks/TaskCard.tsx` | Individual task card |
| `src/components/tasks/TaskDialog.tsx` | Create/edit task modal |
| `src/components/ui/Button.tsx` | Reusable button |
| `src/components/ui/Dialog.tsx` | Reusable modal dialog |
| `src/types/index.ts` | Shared TypeScript types |

### Docker & Deploy (`root`)

| File | Responsibility |
|------|---------------|
| `docker/Dockerfile.api` | Python 3.12, uv install, entrypoint |
| `docker/Dockerfile.web` | Node 20 build → Nginx serve |
| `docker/Dockerfile.worker` | Same as api, Celery CMD |
| `docker/entrypoint-api.sh` | Alembic migrate + uvicorn |
| `docker/entrypoint-worker.sh` | Celery worker start |
| `docker/nginx.conf` | SPA fallback + API proxy |
| `docker-compose.yml` | Dev: postgres, redis, api, web |
| `docker-compose.prod.yml` | Prod overlay: Caddy, restart policies |
| `deploy.sh` | One-click deploy script |
| `backup.sh` | PostgreSQL backup script |
| `Caddyfile` | HTTPS + reverse proxy |
| `.env.example` | Environment variable template |
| `.gitignore` | Standard ignores |
| `.dockerignore` | Docker build ignores |

---

## Task 1: Backend Project Scaffolding

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/base.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/db/encryption.py`
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/api/deps.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "toto-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "pydantic>=2.6",
    "pydantic-settings>=2.2",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "celery[redis]>=5.4",
    "redis>=5.0",
    "httpx>=0.27",
    "python-jose[cryptography]>=3.3",
    "bcrypt>=4.1",
    "cryptography>=42.0",
    "python-multipart>=0.0.9",
    "openai>=1.30",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "httpx>=0.27",
    "ruff>=0.4",
    "mypy>=1.10",
]

[tool.ruff]
target-version = "py312"
line-length = 120

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

- [ ] **Step 2: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 3: Create `backend/app/config.py`**

```python
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/toto"
    redis_url: str = "redis://localhost:6379/0"

    admin_username: str = "admin"
    admin_password_hash: str = ""
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    encryption_key: str = ""

    default_ai_provider: str = "deepseek"
    default_ai_base_url: str = "https://api.deepseek.com/v1"
    default_ai_api_key: str = ""
    default_ai_model: str = "deepseek-chat"

    celery_worker_concurrency: int = 2

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Create `backend/app/db/base.py`**

```python
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=naming_convention)
```

- [ ] **Step 5: Create `backend/app/db/__init__.py`**

Empty file.

- [ ] **Step 6: Create `backend/app/db/session.py`**

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def init_engine() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    _sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    return _sessionmaker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    sm = _sessionmaker or init_engine()
    async with sm() as session:
        yield session
```

- [ ] **Step 7: Create `backend/app/db/encryption.py`**

```python
from cryptography.fernet import Fernet
from sqlalchemy import String, TypeDecorator

from app.config import get_settings


class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        key = get_settings().encryption_key.encode()
        return Fernet(key).encrypt(value.encode()).decode()

    def process_result_value(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        key = get_settings().encryption_key.encode()
        return Fernet(key).decrypt(value.encode()).decode()
```

- [ ] **Step 8: Create `backend/app/api/__init__.py`**

Empty file.

- [ ] **Step 9: Create `backend/app/api/router.py`**

```python
from fastapi import APIRouter

from app.auth.routes import router as auth_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
```

We'll add more routers in subsequent tasks.

- [ ] **Step 10: Create `backend/app/api/deps.py`**

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session
```

- [ ] **Step 11: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Toto API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
```

- [ ] **Step 12: Install dependencies and verify**

```bash
cd backend
pip install uv
uv pip install -e ".[dev]"
python -c "from app.main import app; print('OK')"
```

Expected: prints `OK`.

- [ ] **Step 13: Commit**

```bash
git init
git add backend/
git commit -m "feat: backend project scaffolding with FastAPI + SQLAlchemy + config"
```

---

## Task 2: Auth Module

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/models.py`
- Create: `backend/app/auth/schemas.py`
- Create: `backend/app/auth/password.py`
- Create: `backend/app/auth/jwt_utils.py`
- Create: `backend/app/auth/dependencies.py`
- Create: `backend/app/auth/routes.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Create `backend/app/auth/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/auth/models.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create `backend/app/auth/schemas.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    avatar_url: str | None
    created_at: datetime
```

- [ ] **Step 4: Create `backend/app/auth/password.py`**

```python
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

- [ ] **Step 5: Create `backend/app/auth/jwt_utils.py`**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings


def create_access_token(username: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None
```

- [ ] **Step 6: Create `backend/app/auth/dependencies.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.jwt_utils import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_username(token: str = Depends(oauth2_scheme)) -> str:
    username = decode_token(token)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return username
```

- [ ] **Step 7: Create `backend/app/auth/routes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.jwt_utils import create_access_token
from app.auth.models import User
from app.auth.password import verify_password
from app.auth.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.username)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(user)
```

- [ ] **Step 8: Create `backend/tests/__init__.py` and `backend/tests/conftest.py`**

```python
# tests/conftest.py
import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.models import User
from app.auth.password import hash_password
from app.db.base import Base
from app.main import create_app
from app.api.deps import get_db


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(engine, expire_on_commit=False)
    async with sm() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def seed_admin(db_session: AsyncSession):
    admin = User(
        id=uuid.uuid4(),
        username="admin",
        password_hash=hash_password("admin123"),
        email="admin@toto.local",
    )
    db_session.add(admin)
    await db_session.commit()
    return admin


@pytest.fixture
async def client(db_session: AsyncSession, seed_admin) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 9: Create `backend/tests/test_auth.py`**

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    login_resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["access_token"]
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401
```

- [ ] **Step 10: Add `aiosqlite` to dev dependencies in `pyproject.toml`**

Add `"aiosqlite>=0.20"` to the `[project.optional-dependencies] dev` list for test SQLite support.

- [ ] **Step 11: Run tests**

```bash
cd backend
pytest tests/test_auth.py -v
```

Expected: 4 tests pass.

- [ ] **Step 12: Commit**

```bash
git add backend/app/auth/ backend/tests/
git commit -m "feat: auth module with JWT login and tests"
```

---

## Task 3: Task Domain — Models, Schemas, Service, Routes

**Files:**
- Create: `backend/app/tasks_domain/__init__.py`
- Create: `backend/app/tasks_domain/models.py`
- Create: `backend/app/tasks_domain/schemas.py`
- Create: `backend/app/tasks_domain/service.py`
- Create: `backend/app/tasks_domain/routes.py`
- Modify: `backend/app/api/router.py` — add task router
- Create: `backend/tests/test_tasks.py`

- [ ] **Step 1: Create `backend/app/tasks_domain/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/tasks_domain/models.py`**

```python
import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Quadrant(str, enum.Enum):
    urgent_important = "urgent_important"
    important = "important"
    urgent = "urgent"
    neither = "neither"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quadrant: Mapped[Quadrant] = mapped_column(Enum(Quadrant), nullable=False, default=Quadrant.neither)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 3: Create `backend/app/tasks_domain/schemas.py`**

```python
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.tasks_domain.models import Quadrant, TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    quadrant: Quadrant = Quadrant.neither
    priority: int = 0
    due_date: date | None = None
    tags: list[str] | None = None
    project_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    quadrant: Quadrant | None = None
    status: TaskStatus | None = None
    priority: int | None = None
    due_date: date | None = None
    tags: list[str] | None = None
    project_id: uuid.UUID | None = None
    sort_order: int | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID | None
    title: str
    description: str | None
    quadrant: Quadrant
    status: TaskStatus
    priority: int
    due_date: date | None
    tags: list[str] | None
    sort_order: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/tasks_domain/service.py`**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks_domain.models import Quadrant, Task, TaskStatus
from app.tasks_domain.schemas import TaskCreate, TaskUpdate


async def list_tasks(
    db: AsyncSession,
    user_id: uuid.UUID,
    quadrant: Quadrant | None = None,
    status: TaskStatus | None = None,
) -> list[Task]:
    stmt = select(Task).where(Task.user_id == user_id).order_by(Task.sort_order, Task.created_at.desc())
    if quadrant is not None:
        stmt = stmt.where(Task.quadrant == quadrant)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    return result.scalar_one_or_none()


async def create_task(db: AsyncSession, user_id: uuid.UUID, data: TaskCreate) -> Task:
    task = Task(user_id=user_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == TaskStatus.done and task.completed_at is None:
        update_data["completed_at"] = datetime.now(timezone.utc)
    for key, value in update_data.items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()
```

- [ ] **Step 5: Create `backend/app/tasks_domain/routes.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.tasks_domain.models import Quadrant, TaskStatus
from app.tasks_domain.schemas import TaskCreate, TaskOut, TaskUpdate
from app.tasks_domain import service

from sqlalchemy import select

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    quadrant: Quadrant | None = Query(None),
    task_status: TaskStatus | None = Query(None, alias="status"),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    tasks = await service.list_tasks(db, user_id, quadrant=quadrant, status=task_status)
    return [TaskOut.model_validate(t) for t in tasks]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    task = await service.create_task(db, user_id, body)
    return TaskOut.model_validate(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await service.update_task(db, task, body)
    return TaskOut.model_validate(updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await service.delete_task(db, task)
```

- [ ] **Step 6: Update `backend/app/api/router.py`**

```python
from fastapi import APIRouter

from app.auth.routes import router as auth_router
from app.tasks_domain.routes import router as tasks_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
```

- [ ] **Step 7: Create `backend/tests/test_tasks.py`**

```python
import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post(
        "/api/tasks",
        json={"title": "Test task", "quadrant": "urgent_important"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test task"
    assert data["quadrant"] == "urgent_important"
    assert data["status"] == "todo"


@pytest.mark.asyncio
async def test_list_tasks_by_quadrant(client: AsyncClient):
    token = await _get_token(client)
    await client.post("/api/tasks", json={"title": "Q1", "quadrant": "urgent_important"}, headers=_auth(token))
    await client.post("/api/tasks", json={"title": "Q2", "quadrant": "important"}, headers=_auth(token))

    resp = await client.get("/api/tasks?quadrant=urgent_important", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Q1"


@pytest.mark.asyncio
async def test_update_task_to_done(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/tasks", json={"title": "Finish me"}, headers=_auth(token))
    task_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/tasks/{task_id}", json={"status": "done"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["completed_at"] is not None


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/tasks", json={"title": "Delete me"}, headers=_auth(token))
    task_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/tasks/{task_id}", headers=_auth(token))
    assert resp.status_code == 204

    resp = await client.get(f"/api/tasks/{task_id}", headers=_auth(token))
    assert resp.status_code == 404
```

- [ ] **Step 8: Run tests**

```bash
cd backend
pytest tests/ -v
```

Expected: All 8 tests pass (4 auth + 4 tasks).

- [ ] **Step 9: Commit**

```bash
git add backend/app/tasks_domain/ backend/app/api/router.py backend/tests/test_tasks.py
git commit -m "feat: task CRUD with four-quadrant classification and tests"
```

---

## Task 4: Project Domain — Models, Schemas, Service, Routes

**Files:**
- Create: `backend/app/projects/__init__.py`
- Create: `backend/app/projects/models.py`
- Create: `backend/app/projects/schemas.py`
- Create: `backend/app/projects/service.py`
- Create: `backend/app/projects/routes.py`
- Modify: `backend/app/api/router.py` — add project router
- Create: `backend/tests/test_projects.py`

- [ ] **Step 1: Create `backend/app/projects/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/projects/models.py`**

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PDCAPhase(str, enum.Enum):
    plan = "plan"
    do = "do"
    check = "check"
    act = "act"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    icon: Mapped[str] = mapped_column(String(10), default="📁")
    pdca_phase: Mapped[PDCAPhase] = mapped_column(Enum(PDCAPhase), default=PDCAPhase.plan)
    pdca_cycle: Mapped[int] = mapped_column(Integer, default=1)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PDCALog(Base):
    __tablename__ = "pdca_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[PDCAPhase] = mapped_column(Enum(PDCAPhase), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create `backend/app/projects/schemas.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.projects.models import PDCAPhase


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#6366f1"
    icon: str = "📁"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_archived: bool | None = None


class PDCAAdvance(BaseModel):
    content: str
    outcome: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    color: str
    icon: str
    pdca_phase: PDCAPhase
    pdca_cycle: int
    is_archived: bool
    created_at: datetime


class PDCALogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    cycle: int
    phase: PDCAPhase
    content: str
    outcome: str | None
    created_at: datetime
```

- [ ] **Step 4: Create `backend/app/projects/service.py`**

```python
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.projects.models import PDCALog, PDCAPhase, Project
from app.projects.schemas import PDCAAdvance, ProjectCreate, ProjectUpdate

_PHASE_ORDER = [PDCAPhase.plan, PDCAPhase.do, PDCAPhase.check, PDCAPhase.act]


async def list_projects(db: AsyncSession, user_id: uuid.UUID, include_archived: bool = False) -> list[Project]:
    stmt = select(Project).where(Project.user_id == user_id).order_by(Project.created_at.desc())
    if not include_archived:
        stmt = stmt.where(Project.is_archived == False)  # noqa: E712
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, user_id: uuid.UUID, data: ProjectCreate) -> Project:
    project = Project(user_id=user_id, **data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


async def advance_pdca(db: AsyncSession, project: Project, data: PDCAAdvance) -> tuple[Project, PDCALog]:
    log = PDCALog(
        project_id=project.id,
        cycle=project.pdca_cycle,
        phase=project.pdca_phase,
        content=data.content,
        outcome=data.outcome,
    )
    db.add(log)

    current_idx = _PHASE_ORDER.index(project.pdca_phase)
    if current_idx < len(_PHASE_ORDER) - 1:
        project.pdca_phase = _PHASE_ORDER[current_idx + 1]
    else:
        project.pdca_cycle += 1
        project.pdca_phase = PDCAPhase.plan

    await db.commit()
    await db.refresh(project)
    await db.refresh(log)
    return project, log


async def get_pdca_logs(db: AsyncSession, project_id: uuid.UUID) -> list[PDCALog]:
    result = await db.execute(
        select(PDCALog).where(PDCALog.project_id == project_id).order_by(PDCALog.created_at)
    )
    return list(result.scalars().all())
```

- [ ] **Step 5: Create `backend/app/projects/routes.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.projects.schemas import PDCAAdvance, PDCALogOut, ProjectCreate, ProjectOut, ProjectUpdate
from app.projects import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    include_archived: bool = Query(False),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    projects = await service.list_projects(db, user_id, include_archived)
    return [ProjectOut.model_validate(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    project = await service.create_project(db, user_id, body)
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = await service.update_project(db, project, body)
    return ProjectOut.model_validate(updated)


@router.post("/{project_id}/pdca/advance", response_model=ProjectOut)
async def advance_pdca(
    project_id: uuid.UUID,
    body: PDCAAdvance,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated, _log = await service.advance_pdca(db, project, body)
    return ProjectOut.model_validate(updated)


@router.get("/{project_id}/pdca/logs", response_model=list[PDCALogOut])
async def get_pdca_logs(
    project_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = await service.get_pdca_logs(db, project_id)
    return [PDCALogOut.model_validate(log) for log in logs]
```

- [ ] **Step 6: Update `backend/app/api/router.py`**

```python
from fastapi import APIRouter

from app.auth.routes import router as auth_router
from app.tasks_domain.routes import router as tasks_router
from app.projects.routes import router as projects_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
```

- [ ] **Step 7: Create `backend/tests/test_projects.py`**

```python
import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/projects", json={"name": "My Project"}, headers=_auth(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Project"
    assert data["pdca_phase"] == "plan"
    assert data["pdca_cycle"] == 1


@pytest.mark.asyncio
async def test_pdca_advance_full_cycle(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/projects", json={"name": "PDCA Test"}, headers=_auth(token))
    pid = create_resp.json()["id"]

    for expected_phase in ["do", "check", "act", "plan"]:
        resp = await client.post(
            f"/api/projects/{pid}/pdca/advance",
            json={"content": f"Phase work done"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["pdca_phase"] == expected_phase

    assert resp.json()["pdca_cycle"] == 2

    logs_resp = await client.get(f"/api/projects/{pid}/pdca/logs", headers=_auth(token))
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()) == 4
```

- [ ] **Step 8: Run all tests**

```bash
cd backend
pytest tests/ -v
```

Expected: All 10 tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/app/projects/ backend/app/api/router.py backend/tests/test_projects.py
git commit -m "feat: project management with PDCA cycle and tests"
```

---

## Task 5: Alembic Migration Setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

- [ ] **Step 1: Initialize Alembic**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 2: Replace `backend/alembic.ini`**

Set `sqlalchemy.url` to empty (runtime override in env.py):

```ini
[alembic]
script_location = alembic
sqlalchemy.url =

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 3: Replace `backend/alembic/env.py`**

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import get_settings
from app.db.base import Base

# Import all models so Alembic can detect them
from app.auth.models import User  # noqa: F401
from app.tasks_domain.models import Task  # noqa: F401
from app.projects.models import Project, PDCALog  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = get_settings().database_url
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = get_settings().database_url
    engine = async_engine_from_config(cfg, prefix="sqlalchemy.")
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 4: Generate initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial schema: users, tasks, projects, pdca_logs"
```

Expected: New migration file in `alembic/versions/`.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: alembic migration setup with initial schema"
```

---

## Task 6: Docker Infrastructure

**Files:**
- Create: `docker/Dockerfile.api`
- Create: `docker/Dockerfile.web`
- Create: `docker/Dockerfile.worker`
- Create: `docker/entrypoint-api.sh`
- Create: `docker/entrypoint-worker.sh`
- Create: `docker/nginx.conf`
- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `Caddyfile`
- Create: `deploy.sh`
- Create: `backup.sh`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `.dockerignore`

- [ ] **Step 1: Create `docker/Dockerfile.api`**

```dockerfile
FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install uv

COPY backend/pyproject.toml ./
RUN uv pip install --system -e "."

COPY backend/ ./
COPY docker/entrypoint-api.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create `docker/entrypoint-api.sh`**

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
exec "$@"
```

- [ ] **Step 3: Create `docker/Dockerfile.worker`**

```dockerfile
FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install uv

COPY backend/pyproject.toml ./
RUN uv pip install --system -e "."

COPY backend/ ./
COPY docker/entrypoint-worker.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["celery", "-A", "app.tasks.celery_app", "worker", "--loglevel=info"]
```

- [ ] **Step 4: Create `docker/entrypoint-worker.sh`**

```bash
#!/bin/sh
set -e
echo "Starting Celery worker..."
exec "$@"
```

- [ ] **Step 5: Create `docker/Dockerfile.web`**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 6: Create `docker/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://api:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://api:8000/health;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 7: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-toto}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  pgdata:
```

- [ ] **Step 8: Create `docker-compose.prod.yml`**

```yaml
services:
  api:
    restart: unless-stopped
    ports: !reset []

  web:
    restart: unless-stopped
    ports: !reset []

  postgres:
    restart: unless-stopped

  redis:
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web

volumes:
  caddy_data:
  caddy_config:
```

- [ ] **Step 9: Create `Caddyfile`**

```
{$DOMAIN} {
    reverse_proxy web:80

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    encode gzip zstd

    log {
        output file /data/access.log
        format json
    }
}
```

- [ ] **Step 10: Create `deploy.sh`**

```bash
#!/bin/bash
set -e

echo "=== Toto Deploy ==="

# Check required env vars
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example and fill in values."
    exit 1
fi

source .env

for var in POSTGRES_PASSWORD JWT_SECRET DOMAIN; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set in .env"
        exit 1
    fi
done

# Pull latest code if git repo
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

# Build and start
echo "Building containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

echo "Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health check
echo "Waiting for API to be ready..."
for i in $(seq 1 60); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "ERROR: API failed to start within 60 seconds"
        docker compose logs api
        exit 1
    fi
    sleep 1
done

echo ""
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo ""
echo "=== Deploy complete: https://$DOMAIN ==="
```

- [ ] **Step 11: Create `backup.sh`**

```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

echo "=== Toto Backup ==="

# Database backup
echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U postgres toto | gzip > "$BACKUP_DIR/toto.sql.gz"

# Env backup
echo "Backing up .env..."
cp .env "$BACKUP_DIR/env.bak"

# Prune old backups
echo "Pruning backups older than 30 days..."
find ./backups -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo "=== Backup complete: $BACKUP_DIR ==="
ls -la "$BACKUP_DIR"
```

- [ ] **Step 12: Create `.env.example`**

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/toto
POSTGRES_DB=toto
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-strong-password

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-your-password>
JWT_SECRET=<generate-with: openssl rand -hex 32>

# Encryption (for AI API keys at rest)
ENCRYPTION_KEY=<generate-with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# AI defaults (can be managed in web UI)
DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_BASE_URL=https://api.deepseek.com/v1
DEFAULT_AI_API_KEY=
DEFAULT_AI_MODEL=deepseek-chat

# Celery
CELERY_WORKER_CONCURRENCY=2

# Deploy
DOMAIN=toto.example.com
```

- [ ] **Step 13: Create `.gitignore`**

```
__pycache__/
*.pyc
.env
*.egg-info/
dist/
build/
node_modules/
frontend/dist/
.venv/
backups/
.superpowers/
.omc/
```

- [ ] **Step 14: Create `.dockerignore`**

```
.git
.env
node_modules
__pycache__
*.pyc
backups
.superpowers
.omc
```

- [ ] **Step 15: Make scripts executable and commit**

```bash
chmod +x deploy.sh backup.sh docker/entrypoint-api.sh docker/entrypoint-worker.sh
git add docker/ docker-compose.yml docker-compose.prod.yml Caddyfile deploy.sh backup.sh .env.example .gitignore .dockerignore
git commit -m "feat: Docker infrastructure with deploy and backup scripts"
```

---

## Task 7: Frontend Project Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/globals.css`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "toto-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.50.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
```

- [ ] **Step 3: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#6366f1", light: "#8b5cf6" },
        surface: { DEFAULT: "#0a0a0f", raised: "#0f0f18" },
        q1: "#ef4444",
        q2: "#f59e0b",
        q3: "#3b82f6",
        q4: "#6b7280",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create `frontend/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Toto</title>
  </head>
  <body class="bg-surface text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei",
    sans-serif;
  background: #0a0a0f;
  color: #e4e4e7;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
```

- [ ] **Step 8: Create `frontend/src/types/index.ts`**

```typescript
export type Quadrant =
  | "urgent_important"
  | "important"
  | "urgent"
  | "neither";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type PDCAPhase = "plan" | "do" | "check" | "act";

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  quadrant: Quadrant;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  tags: string[] | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  pdca_phase: PDCAPhase;
  pdca_cycle: number;
  is_archived: boolean;
  created_at: string;
}

export interface TodayStats {
  completed: number;
  pending: number;
  total: number;
}
```

- [ ] **Step 9: Create `frontend/src/api/client.ts`**

```typescript
import axios from "axios";

const client = axios.create({ baseURL: "/api" });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("toto_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("toto_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
```

- [ ] **Step 10: Create `frontend/src/hooks/useAuth.ts`**

```typescript
import { useState, useCallback } from "react";
import client from "../api/client";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("toto_token"));

  const login = useCallback(async (username: string, password: string) => {
    const resp = await client.post("/auth/login", { username, password });
    const t = resp.data.access_token;
    localStorage.setItem("toto_token", t);
    setToken(t);
    return t;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("toto_token");
    setToken(null);
  }, []);

  return { token, isLoggedIn: !!token, login, logout };
}
```

- [ ] **Step 11: Create `frontend/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 12: Create `frontend/src/App.tsx`** (placeholder with routing)

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

function LoginPage() {
  return <div className="flex items-center justify-center h-screen">Login placeholder</div>;
}

function DashboardPage() {
  return <div className="p-8">Dashboard placeholder</div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 13: Install and verify**

```bash
cd frontend
corepack enable
pnpm install
pnpm build
```

Expected: Build succeeds, `dist/` created.

- [ ] **Step 14: Commit**

```bash
git add frontend/
git commit -m "feat: frontend project scaffolding with React, Vite, Tailwind, auth hook"
```

---

## Task 8: Frontend — Login Page

**Files:**
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/App.tsx` — replace placeholder

- [ ] **Step 1: Create `frontend/src/api/auth.ts`**

```typescript
import client from "./client";

export async function loginApi(username: string, password: string) {
  const resp = await client.post<{ access_token: string }>("/auth/login", {
    username,
    password,
  });
  return resp.data;
}
```

- [ ] **Step 2: Create `frontend/src/pages/LoginPage.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("用户名或密码错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-surface-raised border border-white/[0.06]">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand/30">
            T
          </div>
          <span className="text-2xl font-bold">
            To<span className="text-brand-light">to</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 transition"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 transition"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white font-semibold text-sm shadow-lg shadow-brand/30 hover:shadow-brand/50 transition disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `frontend/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";

function DashboardPage() {
  return <div className="p-8 text-white/50">Dashboard — coming next</div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: login page with auth flow"
```

---

## Task 9: Frontend — Layout Shell + Sidebar

**Files:**
- Create: `frontend/src/components/layout/Shell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/RightPanel.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/App.tsx` — use Shell layout

- [ ] **Step 1: Create `frontend/src/components/layout/Sidebar.tsx`**

```tsx
import { useAuth } from "../../hooks/useAuth";

const NAV_GROUPS = [
  {
    label: "工作台",
    items: [
      { icon: "📋", name: "任务看板", path: "/" },
      { icon: "📅", name: "时间线", path: "/timeline", disabled: true },
      { icon: "📁", name: "项目", path: "/projects", disabled: true },
      { icon: "🎯", name: "OKR 目标", path: "/okrs", disabled: true },
    ],
  },
  {
    label: "个人成长",
    items: [
      { icon: "📝", name: "每日复盘", path: "/reviews", disabled: true },
      { icon: "📊", name: "周/月汇总", path: "/summaries", disabled: true },
      { icon: "🔥", name: "习惯打卡", path: "/habits", disabled: true },
      { icon: "🍅", name: "番茄钟", path: "/pomodoro", disabled: true },
    ],
  },
  {
    label: "系统",
    items: [
      { icon: "🤖", name: "AI 配置", path: "/settings/ai", disabled: true },
      { icon: "📢", name: "飞书推送", path: "/settings/feishu", disabled: true },
      { icon: "⚙️", name: "设置", path: "/settings", disabled: true },
    ],
  },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-60 bg-gradient-to-b from-surface-raised to-surface border-r border-white/[0.06] flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white font-bold shadow-lg shadow-brand/30">
          T
        </div>
        <span className="text-xl font-bold">
          To<span className="text-brand-light">to</span>
        </span>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {group.label}
            </div>
            {group.items.map((item) => (
              <a
                key={item.path}
                href={item.disabled ? undefined : item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                  item.path === "/"
                    ? "bg-gradient-to-r from-brand/15 to-brand-light/10 text-purple-300 font-medium"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                } ${item.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.name}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/40 hover:bg-white/[0.04] hover:text-white/70 transition"
        >
          <span className="text-base w-5 text-center">🚪</span>
          退出登录
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/layout/RightPanel.tsx`**

```tsx
export default function RightPanel() {
  return (
    <aside className="w-[300px] border-l border-white/[0.06] bg-surface-raised/60 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          📊 今日统计
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: "—", label: "已完成", color: "text-emerald-400" },
            { value: "—", label: "待处理", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-white/30 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
        番茄钟 & 习惯 — Phase 4
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/layout/Shell.tsx`**

```tsx
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <RightPanel />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/pages/DashboardPage.tsx`**

```tsx
export default function DashboardPage() {
  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-bold">📋 任务看板</h1>
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {["四象限", "看板", "时间线", "列表"].map((v, i) => (
              <button
                key={v}
                className={`px-3.5 py-1.5 rounded-md text-xs transition ${
                  i === 0 ? "bg-white/[0.08] text-white font-medium" : "text-white/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30">
          ✚ 新任务
        </button>
      </header>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="text-white/30 text-center py-20">四象限视图 — Task 10 实现</div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Update `frontend/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import Shell from "./components/layout/Shell";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: app shell with sidebar, right panel, and dashboard layout"
```

---

## Task 10: Frontend — Quadrant View + Task CRUD

**Files:**
- Create: `frontend/src/api/tasks.ts`
- Create: `frontend/src/components/tasks/QuadrantGrid.tsx`
- Create: `frontend/src/components/tasks/QuadrantColumn.tsx`
- Create: `frontend/src/components/tasks/TaskCard.tsx`
- Create: `frontend/src/components/tasks/TaskDialog.tsx`
- Create: `frontend/src/components/ui/Dialog.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create `frontend/src/api/tasks.ts`**

```typescript
import client from "./client";
import type { Task, Quadrant, TaskStatus } from "../types";

export async function fetchTasks(params?: {
  quadrant?: Quadrant;
  status?: TaskStatus;
}) {
  const resp = await client.get<Task[]>("/tasks", { params });
  return resp.data;
}

export async function createTask(data: {
  title: string;
  quadrant?: Quadrant;
  description?: string;
  due_date?: string;
}) {
  const resp = await client.post<Task>("/tasks", data);
  return resp.data;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    quadrant: Quadrant;
    status: TaskStatus;
    description: string;
    due_date: string;
    priority: number;
  }>
) {
  const resp = await client.patch<Task>(`/tasks/${id}`, data);
  return resp.data;
}

export async function deleteTask(id: string) {
  await client.delete(`/tasks/${id}`);
}
```

- [ ] **Step 2: Create `frontend/src/components/ui/Dialog.tsx`**

```tsx
import { useEffect, useRef } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-full max-w-md bg-surface-raised border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/tasks/TaskCard.tsx`**

```tsx
import type { Task } from "../../types";
import { updateTask } from "../../api/tasks";
import { useQueryClient } from "@tanstack/react-query";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const qc = useQueryClient();
  const isDone = task.status === "done";

  const toggleDone = async () => {
    await updateTask(task.id, { status: isDone ? "todo" : "done" });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-3.5 py-3 cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.1] hover:-translate-y-px transition-all"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDone();
          }}
          className={`w-4 h-4 rounded flex-shrink-0 border-[1.5px] transition ${
            isDone
              ? "bg-emerald-500 border-emerald-500"
              : "border-white/20 hover:border-white/40"
          }`}
        />
        <span className={`text-[13px] font-medium ${isDone ? "line-through opacity-40" : ""}`}>
          {task.title}
        </span>
      </div>
      {task.due_date && (
        <div className="ml-6 mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300">
            ⏰ {task.due_date}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/tasks/QuadrantColumn.tsx`**

```tsx
import type { Task, Quadrant } from "../../types";
import TaskCard from "./TaskCard";

const QUADRANT_CONFIG: Record<Quadrant, { label: string; color: string; dot: string }> = {
  urgent_important: { label: "紧急且重要", color: "from-q1/[0.06] to-q1/[0.02]", dot: "🔴" },
  important: { label: "重要不紧急", color: "from-q2/[0.06] to-q2/[0.02]", dot: "🟡" },
  urgent: { label: "紧急不重要", color: "from-q3/[0.06] to-q3/[0.02]", dot: "🔵" },
  neither: { label: "不紧急不重要", color: "from-q4/[0.06] to-q4/[0.02]", dot: "⚪" },
};

interface Props {
  quadrant: Quadrant;
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export default function QuadrantColumn({ quadrant, tasks, onEdit }: Props) {
  const cfg = QUADRANT_CONFIG[quadrant];
  const borderColor = `border-${quadrant === "urgent_important" ? "q1" : quadrant === "important" ? "q2" : quadrant === "urgent" ? "q3" : "q4"}/10`;

  return (
    <div className={`rounded-[14px] p-4 bg-gradient-to-br ${cfg.color} border ${borderColor} relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span>{cfg.dot}</span> {cfg.label}
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30">
          {tasks.length} 项
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[calc(100%-40px)]">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-white/15 text-xs py-8">暂无任务</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/tasks/QuadrantGrid.tsx`**

```tsx
import type { Task, Quadrant } from "../../types";
import QuadrantColumn from "./QuadrantColumn";

const QUADRANTS: Quadrant[] = ["urgent_important", "important", "urgent", "neither"];

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export default function QuadrantGrid({ tasks, onEdit }: Props) {
  const grouped = QUADRANTS.reduce(
    (acc, q) => {
      acc[q] = tasks.filter((t) => t.quadrant === q && t.status !== "cancelled");
      return acc;
    },
    {} as Record<Quadrant, Task[]>
  );

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
      {QUADRANTS.map((q) => (
        <QuadrantColumn key={q} quadrant={q} tasks={grouped[q]} onEdit={onEdit} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/tasks/TaskDialog.tsx`**

```tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Dialog from "../ui/Dialog";
import { createTask, updateTask, deleteTask } from "../../api/tasks";
import type { Task, Quadrant } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  editTask?: Task | null;
  defaultQuadrant?: Quadrant;
}

export default function TaskDialog({ open, onClose, editTask, defaultQuadrant }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quadrant, setQuadrant] = useState<Quadrant>(defaultQuadrant ?? "neither");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description ?? "");
      setQuadrant(editTask.quadrant);
      setDueDate(editTask.due_date ?? "");
    } else {
      setTitle("");
      setDescription("");
      setQuadrant(defaultQuadrant ?? "neither");
      setDueDate("");
    }
  }, [editTask, defaultQuadrant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editTask) {
        await updateTask(editTask.id, {
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
        });
      } else {
        await createTask({
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
        });
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editTask) return;
    await deleteTask(editTask.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onClose();
  };

  const quadrants: { value: Quadrant; label: string; color: string }[] = [
    { value: "urgent_important", label: "🔴 紧急重要", color: "border-q1/30 bg-q1/10" },
    { value: "important", label: "🟡 重要不急", color: "border-q2/30 bg-q2/10" },
    { value: "urgent", label: "🔵 紧急不重要", color: "border-q3/30 bg-q3/10" },
    { value: "neither", label: "⚪ 不急不重要", color: "border-q4/30 bg-q4/10" },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={editTask ? "编辑任务" : "新建任务"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="任务标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
        />
        <textarea
          placeholder="描述（可选）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none"
        />
        <div>
          <label className="text-xs text-white/40 mb-2 block">象限</label>
          <div className="grid grid-cols-2 gap-2">
            {quadrants.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => setQuadrant(q.value)}
                className={`px-3 py-2 rounded-lg text-xs border transition ${
                  quadrant === q.value ? q.color : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
        />
        <div className="flex gap-3 pt-2">
          {editTask && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
            >
              删除
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/[0.08] hover:bg-white/[0.04] transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30 disabled:opacity-50"
          >
            {saving ? "保存中..." : editTask ? "更新" : "创建"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 7: Update `frontend/src/pages/DashboardPage.tsx`**

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "../api/tasks";
import QuadrantGrid from "../components/tasks/QuadrantGrid";
import TaskDialog from "../components/tasks/TaskDialog";
import type { Task } from "../types";

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditTask(null);
    setDialogOpen(true);
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-bold">📋 任务看板</h1>
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {["四象限", "看板", "时间线", "列表"].map((v, i) => (
              <button
                key={v}
                className={`px-3.5 py-1.5 rounded-md text-xs transition ${
                  i === 0 ? "bg-white/[0.08] text-white font-medium" : "text-white/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 新任务
        </button>
      </header>
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : (
          <QuadrantGrid tasks={tasks} onEdit={handleEdit} />
        )}
      </div>
      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTask={editTask}
      />
    </>
  );
}
```

- [ ] **Step 8: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat: quadrant view with task CRUD dialog"
```

---

## Task 11: Admin Seed Script + Full Integration Test

**Files:**
- Create: `backend/app/scripts/seed_admin.py`

- [ ] **Step 1: Create `backend/app/scripts/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/scripts/seed_admin.py`**

```python
"""Seed the admin user if it doesn't exist. Run inside the api container on first deploy."""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.models import User
from app.auth.password import hash_password
from app.config import get_settings


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    sm = async_sessionmaker(engine, expire_on_commit=False)

    async with sm() as session:
        result = await session.execute(select(User).where(User.username == settings.admin_username))
        if result.scalar_one_or_none() is not None:
            print(f"Admin user '{settings.admin_username}' already exists, skipping.")
            return

        if not settings.admin_password_hash:
            print("ERROR: ADMIN_PASSWORD_HASH not set in .env")
            return

        user = User(
            username=settings.admin_username,
            password_hash=settings.admin_password_hash,
            email="admin@toto.local",
        )
        session.add(user)
        await session.commit()
        print(f"Admin user '{settings.admin_username}' created.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 3: Update `docker/entrypoint-api.sh`** to seed admin

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding admin user..."
python -m app.scripts.seed_admin

echo "Starting API server..."
exec "$@"
```

- [ ] **Step 4: Test full stack locally with Docker**

```bash
# From project root
cp .env.example .env
# Edit .env: set ADMIN_PASSWORD_HASH (generate with: python -c "from app.auth.password import hash_password; print(hash_password('admin123'))")
docker compose up --build -d
# Wait for health
curl http://localhost:8000/health
# Test login
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

Expected: Returns `{"access_token":"...","token_type":"bearer"}`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/scripts/ docker/entrypoint-api.sh
git commit -m "feat: admin seed script and updated entrypoint"
```

---

## Post-Plan Notes

### What Phase 1 Delivers

- Working backend with auth + task CRUD + project CRUD + PDCA advancement
- PC frontend with dark-theme quadrant view, task create/edit/delete/complete
- Full Docker deployment pipeline (dev + prod)
- One-click `deploy.sh` + `backup.sh`

### What Comes Next (Separate Plans)

| Phase | Focus | Depends On |
|-------|-------|-----------|
| Phase 2 | Daily Review + AI 转换 + Celery Worker | Phase 1 |
| Phase 3 | Project UI + PDCA flow pages | Phase 1 |
| Phase 4 | OKR + Habits + Pomodoro | Phase 1 |
| Phase 5 | Weekly/Monthly summaries + Feishu | Phase 2 |
| Phase 6 | Kanban + Timeline + List views | Phase 1 |
| Phase 7 | Flutter Android App | Phase 1 API |
| Phase 8 | Polish, themes, offline, stats dashboard | All above |
