import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

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


class UserAdminRead(UserRead):
    created_at: datetime
    last_login_at: datetime | None = None
    password_changed_at: datetime | None = None


class UserCreateInput(ApiModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=12, max_length=256)
    avatar_media_id: uuid.UUID | None = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("显示名称不能为空")
        return value


class UserUpdateInput(ApiModel):
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=12, max_length=256)
    status: UserStatus | None = None
    avatar_media_id: uuid.UUID | None = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("显示名称不能为空")
        return value


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
