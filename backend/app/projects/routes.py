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
async def list_projects(include_archived: bool = Query(False), username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    projects = await service.list_projects(db, user_id, include_archived)
    return [ProjectOut.model_validate(p) for p in projects]

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(body: ProjectCreate, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    project = await service.create_project(db, user_id, body)
    return ProjectOut.model_validate(project)

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: uuid.UUID, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.model_validate(project)

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: uuid.UUID, body: ProjectUpdate, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = await service.update_project(db, project, body)
    return ProjectOut.model_validate(updated)

@router.post("/{project_id}/pdca/advance", response_model=ProjectOut)
async def advance_pdca(project_id: uuid.UUID, body: PDCAAdvance, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated, _log = await service.advance_pdca(db, project, body)
    return ProjectOut.model_validate(updated)

@router.get("/{project_id}/pdca/logs", response_model=list[PDCALogOut])
async def get_pdca_logs(project_id: uuid.UUID, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    project = await service.get_project(db, project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = await service.get_pdca_logs(db, project_id)
    return [PDCALogOut.model_validate(log) for log in logs]
