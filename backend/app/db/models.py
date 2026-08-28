"""Import every model so Alembic sees the complete metadata graph."""

from app.modules.audit.models import AuditLog, OutboxEvent
from app.modules.auth.models import Session, User
from app.modules.media.models import Media
from app.modules.photography.models import PhotoCollection, PhotoItem
from app.modules.posts.models import Post, PostVersion, post_tags
from app.modules.site.models import ContactMethod, SiteProfile, SocialLink
from app.modules.taxonomy.models import Category, Tag

__all__ = [
    "AuditLog",
    "Category",
    "ContactMethod",
    "Media",
    "OutboxEvent",
    "PhotoCollection",
    "PhotoItem",
    "Post",
    "PostVersion",
    "Session",
    "SiteProfile",
    "SocialLink",
    "Tag",
    "User",
    "post_tags",
]


def register_models() -> None:
    """Load every mapped table into the shared SQLAlchemy metadata."""
