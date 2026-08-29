import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.api.schemas import ApiModel
from app.db.enums import UserStatus


class LoginInput(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class UserRead(ApiModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    status: UserStatus
    avatar_media_id: uuid.UUID | None = None
    avatar_public_url: str | None = None


class UserProfileUpdate(ApiModel):
    avatar_media_id: uuid.UUID | None = None


class LoginData(ApiModel):
    access_token: str
    token_type: str = "Bearer"  # noqa: S105
    expires_in: int
    user: UserRead


class SessionRead(ApiModel):
    id: uuid.UUID
    user_agent: str | None
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime
    current: bool = False
