import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.api.schemas import ApiModel

MediaCategory = Literal["general", "post-cover", "photography", "site", "profile", "contact"]


class MediaBulkDeleteInput(ApiModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=100)


class MediaBulkDeleteResult(ApiModel):
    deleted_count: int
    blocked_count: int
    blocked_names: list[str]


class MediaRead(ApiModel):
    id: uuid.UUID
    public_url: str
    category: MediaCategory
    original_name: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    alt_text: str | None
    created_at: datetime
    usage_count: int = 0
    usage_labels: list[str] = Field(default_factory=list)
