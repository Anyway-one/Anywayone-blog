import uuid
from datetime import date, datetime

from pydantic import Field, model_validator

from app.api.schemas import ApiModel
from app.db.enums import PhotographyStatus


class PhotoItemInput(ApiModel):
    media_id: uuid.UUID
    position: int = Field(ge=0)
    title: str | None = Field(default=None, max_length=200)
    alt_text: str | None = Field(default=None, max_length=320)
    caption: str | None = None


class PhotoItemRead(PhotoItemInput):
    id: uuid.UUID
    public_url: str
    width: int
    height: int
    original_name: str


def empty_photo_items() -> list[PhotoItemInput]:
    return []


class PhotoCollectionCreate(ApiModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None
    cover_media_id: uuid.UUID | None = None
    captured_from: date | None = None
    captured_to: date | None = None
    location_text: str | None = Field(default=None, max_length=200)
    items: list[PhotoItemInput] = Field(default_factory=empty_photo_items, max_length=200)

    @model_validator(mode="after")
    def validate_dates(self) -> "PhotoCollectionCreate":
        if self.captured_from and self.captured_to and self.captured_from > self.captured_to:
            raise ValueError("拍摄开始日期不能晚于结束日期。")
        return self


class PhotoCollectionUpdate(ApiModel):
    revision: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(
        default=None, min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    description: str | None = None
    cover_media_id: uuid.UUID | None = None
    captured_from: date | None = None
    captured_to: date | None = None
    location_text: str | None = Field(default=None, max_length=200)
    items: list[PhotoItemInput] | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_dates(self) -> "PhotoCollectionUpdate":
        if self.captured_from and self.captured_to and self.captured_from > self.captured_to:
            raise ValueError("拍摄开始日期不能晚于结束日期。")
        return self


class PublicationIssue(ApiModel):
    field: str
    message: str


class PublicationValidation(ApiModel):
    valid: bool
    issues: list[PublicationIssue]


class PhotoCollectionListItem(ApiModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    cover_media_id: uuid.UUID | None
    cover_public_url: str | None
    cover_width: int | None
    cover_height: int | None
    captured_from: date | None
    captured_to: date | None
    location_text: str | None
    status: PhotographyStatus
    revision: int
    photo_count: int
    published_at: datetime | None
    updated_at: datetime


class PhotoCollectionRead(ApiModel):
    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    slug: str
    description: str | None
    cover_media_id: uuid.UUID | None
    captured_from: date | None
    captured_to: date | None
    location_text: str | None
    status: PhotographyStatus
    allow_indexing: bool
    revision: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[PhotoItemRead]


class PublicPhotoCollectionListItem(ApiModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    cover_public_url: str
    cover_width: int
    cover_height: int
    captured_from: date | None
    captured_to: date | None
    location_text: str | None
    photo_count: int
    published_at: datetime


class PublicPhotoCollection(ApiModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    captured_from: date | None
    captured_to: date | None
    location_text: str | None
    published_at: datetime
    items: list[PhotoItemRead]
