import uuid
from typing import Annotated, Self, TypeAlias

from pydantic import Field, HttpUrl, field_validator, model_validator

from app.api.schemas import ApiModel
from app.db.enums import ContactType, SocialPlatform

ProfileListItem: TypeAlias = Annotated[str, Field(min_length=1, max_length=50)]
QR_CONTACT_TYPES = {
    ContactType.WECHAT,
    ContactType.QQ,
    ContactType.WHATSAPP,
    ContactType.TELEGRAM,
}


class SiteProfileUpdate(ApiModel):
    avatar_media_id: uuid.UUID | None = None
    public_name: str | None = Field(default=None, max_length=100)
    expertise: str | None = Field(default=None, max_length=160)
    occupation: str | None = Field(default=None, max_length=160)
    zodiac_sign: str | None = Field(default=None, max_length=20)
    chinese_zodiac: str | None = Field(default=None, max_length=20)
    blood_type: str | None = Field(default=None, max_length=10)
    interests: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    location: str | None = Field(default=None, max_length=160)
    favorite_cities: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    tags: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    personality_type: str | None = Field(default=None, max_length=40)
    motto: str | None = Field(default=None, max_length=240)
    bio: str | None = Field(default=None, max_length=4000)

    @field_validator(
        "public_name",
        "expertise",
        "occupation",
        "zodiac_sign",
        "chinese_zodiac",
        "blood_type",
        "location",
        "personality_type",
        "motto",
        "bio",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("interests", "favorite_cities", "tags")
    @classmethod
    def normalize_list(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))


class SiteProfileRead(SiteProfileUpdate):
    id: uuid.UUID | None = None
    avatar_public_url: str | None = None


class ContactMethodInput(ApiModel):
    contact_type: ContactType
    value: str = Field(min_length=1, max_length=320)
    qr_media_id: uuid.UUID | None = None
    sort_order: int = Field(default=0, ge=0, le=1000)
    is_enabled: bool = False

    @field_validator("value")
    @classmethod
    def strip_value(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_qr_support(self) -> Self:
        if self.qr_media_id is not None and self.contact_type not in QR_CONTACT_TYPES:
            raise ValueError("该联系方式不支持二维码")
        return self


class ContactSettingsUpdate(ApiModel):
    items: list[ContactMethodInput] = Field(max_length=6)

    @model_validator(mode="after")
    def validate_unique_types(self) -> Self:
        types = [item.contact_type for item in self.items]
        if len(types) != len(set(types)):
            raise ValueError("联系方式类型不能重复")
        return self


class ContactMethodRead(ContactMethodInput):
    id: uuid.UUID
    qr_public_url: str | None = None
    href: str | None = None


class SocialLinkInput(ApiModel):
    platform: SocialPlatform
    account_name: str | None = Field(default=None, max_length=160)
    url: HttpUrl | None = None
    sort_order: int = Field(default=0, ge=0, le=1000)
    is_enabled: bool = False

    @field_validator("account_name")
    @classmethod
    def normalize_account_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def validate_content(self) -> Self:
        if self.account_name is None and self.url is None:
            raise ValueError("账号名和链接至少填写一项")
        return self


class SocialSettingsUpdate(ApiModel):
    items: list[SocialLinkInput] = Field(max_length=10)

    @model_validator(mode="after")
    def validate_unique_platforms(self) -> Self:
        platforms = [item.platform for item in self.items]
        if len(platforms) != len(set(platforms)):
            raise ValueError("社交平台不能重复")
        return self


class SocialLinkRead(ApiModel):
    id: uuid.UUID
    platform: SocialPlatform
    account_name: str | None
    url: str | None
    sort_order: int
    is_enabled: bool


class PublicSiteData(ApiModel):
    profile: SiteProfileRead
    contacts: list[ContactMethodRead]
    social_links: list[SocialLinkRead]
