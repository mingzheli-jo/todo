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
    log = PDCALog(project_id=project.id, cycle=project.pdca_cycle, phase=project.pdca_phase, content=data.content, outcome=data.outcome)
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
    result = await db.execute(select(PDCALog).where(PDCALog.project_id == project_id).order_by(PDCALog.created_at))
    return list(result.scalars().all())
