import uuid
from datetime import datetime

from pydantic import Field, HttpUrl, field_validator

from app.api.schemas import ApiModel
from app.db.enums import PostStatus, Visibility


class SeoInput(ApiModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=320)
    canonical_url: HttpUrl | None = None
    allow_indexing: bool = True


class PostCreate(ApiModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    markdown: str = ""
    excerpt: str | None = None

    @field_validator("title", "slug")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()


class PostUpdate(ApiModel):
    revision: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    markdown: str | None = None
    excerpt: str | None = None
    visibility: Visibility | None = None
    is_pinned: bool | None = None
    seo: SeoInput | None = None


class RevisionInput(ApiModel):
    revision: int = Field(ge=1)


class PublicationIssue(ApiModel):
    field: str
    message: str


class PublicationValidation(ApiModel):
    valid: bool
    issues: list[PublicationIssue]


class PostRead(ApiModel):
    id: uuid.UUID
    author_id: uuid.UUID
    category_id: uuid.UUID | None
    title: str
    slug: str
    excerpt: str | None
    markdown: str
    rendered_html: str
    toc: list[dict[str, object]]
    status: PostStatus
    visibility: Visibility
    is_pinned: bool
    allow_indexing: bool
    seo_title: str | None
    seo_description: str | None
    canonical_url: str | None
    reading_time_minutes: int
    revision: int
    scheduled_at: datetime | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PostListItem(ApiModel):
    id: uuid.UUID
    title: str
    slug: str
    excerpt: str | None
    status: PostStatus
    visibility: Visibility
    revision: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PublicPostListItem(ApiModel):
    id: uuid.UUID
    title: str
    slug: str
    excerpt: str | None
    reading_time_minutes: int
    published_at: datetime


class PublicPostRead(PublicPostListItem):
    rendered_html: str
    toc: list[dict[str, object]]
    seo_title: str | None
    seo_description: str | None
    canonical_url: str | None
