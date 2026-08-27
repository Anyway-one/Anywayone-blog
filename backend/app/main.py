from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import RequestLoggingMiddleware, configure_logging
from app.core.request_id import RequestIdMiddleware
from app.db import models as db_models
from app.db.session import close_database

settings = get_settings()
configure_logging()
db_models.register_models()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await close_database()


api = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
    lifespan=lifespan,
)

api.add_middleware(RequestLoggingMiddleware)
api.add_middleware(RequestIdMiddleware)
register_exception_handlers(api)
api.include_router(api_router)
api.mount(
    "/media",
    StaticFiles(directory=settings.media_storage_path, check_dir=False),
    name="media",
)

# Keep CORS outside FastAPI's error middleware so unexpected 500 responses are
# still readable by the Admin application on its separate origin.
app = CORSMiddleware(
    app=api,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"],
)
