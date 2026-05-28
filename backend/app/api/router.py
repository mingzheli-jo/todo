from fastapi import APIRouter
from app.auth.routes import router as auth_router
from app.tasks_domain.routes import router as tasks_router
from app.projects.routes import router as projects_router
from app.stats.routes import router as stats_router
from app.ai_providers.routes import router as ai_providers_router
from app.reviews.routes import router as reviews_router
from app.okrs.routes import router as okrs_router
from app.habits.routes import router as habits_router
from app.pomodoro.routes import router as pomodoro_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(stats_router, prefix="/stats", tags=["stats"])
api_router.include_router(ai_providers_router, prefix="/ai-providers", tags=["ai-providers"])
api_router.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
api_router.include_router(okrs_router, prefix="/okrs", tags=["okrs"])
api_router.include_router(habits_router, prefix="/habits", tags=["habits"])
api_router.include_router(pomodoro_router, prefix="/pomodoro", tags=["pomodoro"])
