import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.api.schemas import ApiModel


class TaxonomyCreate(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None

    @field_validator("name", "slug")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()


class CategoryCreate(TaxonomyCreate):
    sort_order: int = Field(default=0, ge=0, le=10000)


class TaxonomyUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    description: str | None = None


class CategoryUpdate(TaxonomyUpdate):
    sort_order: int | None = Field(default=None, ge=0, le=10000)


class TagMergeInput(ApiModel):
    target_tag_id: uuid.UUID


class TaxonomyRead(ApiModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    post_count: int
    created_at: datetime
    updated_at: datetime


class CategoryRead(TaxonomyRead):
    sort_order: int


class TaxonomyMutationResult(ApiModel):
    affected_posts: int
