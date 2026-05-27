from fastapi import APIRouter
from app.auth.routes import router as auth_router
from app.tasks_domain.routes import router as tasks_router
from app.projects.routes import router as projects_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
