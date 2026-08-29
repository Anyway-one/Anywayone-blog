from fastapi import APIRouter

from app.api import health
from app.core.config import get_settings
from app.modules.auth import router as auth_router
from app.modules.media import router as media_router
from app.modules.photography import router as photography_router
from app.modules.posts import router as posts_router
from app.modules.site import router as site_router
from app.modules.taxonomy import router as taxonomy_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router.router, prefix=get_settings().api_v1_prefix)
api_router.include_router(auth_router.admin_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(posts_router.admin_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(posts_router.public_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(photography_router.admin_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(photography_router.public_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(media_router.router, prefix=get_settings().api_v1_prefix)
api_router.include_router(taxonomy_router.admin_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(taxonomy_router.public_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(site_router.admin_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(site_router.public_router, prefix=get_settings().api_v1_prefix)
api_router.include_router(site_router.analytics_router, prefix=get_settings().api_v1_prefix)
