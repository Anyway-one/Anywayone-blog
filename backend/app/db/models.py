"""Import every model so Alembic sees the complete metadata graph."""

from app.modules.audit.models import AuditLog, OutboxEvent
from app.modules.auth.models import Session, User
from app.modules.posts.models import Post, PostVersion, post_tags
from app.modules.taxonomy.models import Category, Tag

__all__ = [
    "AuditLog",
    "Category",
    "OutboxEvent",
    "Post",
    "PostVersion",
    "Session",
    "Tag",
    "User",
    "post_tags",
]
