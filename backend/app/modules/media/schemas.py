import uuid
from datetime import datetime

from app.api.schemas import ApiModel


class MediaRead(ApiModel):
    id: uuid.UUID
    public_url: str
    original_name: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    alt_text: str | None
    created_at: datetime
