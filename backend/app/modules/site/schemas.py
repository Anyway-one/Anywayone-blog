import uuid
from datetime import date
from typing import Annotated, Literal, Self, TypeAlias

from pydantic import Field, HttpUrl, field_validator, model_validator

from app.api.schemas import ApiModel
from app.db.enums import ContactType, SocialPlatform

ProfileListItem: TypeAlias = Annotated[str, Field(min_length=1, max_length=50)]
EquipmentIcon: TypeAlias = Literal["iphone", "ipad", "iwatch", "AirPods", "MacMini", "macbook", "lcd"]
QR_CONTACT_TYPES = {
    ContactType.WECHAT,
    ContactType.QQ,
    ContactType.WHATSAPP,
    ContactType.TELEGRAM,
}


class ProfileEquipmentItem(ApiModel):
    icon: EquipmentIcon
    name: str = Field(min_length=1, max_length=100)
    detail: str | None = Field(default=None, max_length=160)

    @field_validator("icon", "name", "detail")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SiteProfileUpdate(ApiModel):
    avatar_media_id: uuid.UUID | None = None
    public_name: str | None = Field(default=None, max_length=100)
    expertise: str | None = Field(default=None, max_length=160)
    occupation: str | None = Field(default=None, max_length=160)
    zodiac_sign: str | None = Field(default=None, max_length=20)
    chinese_zodiac: str | None = Field(default=None, max_length=20)
    blood_type: str | None = Field(default=None, max_length=10)
    equipment: list[ProfileEquipmentItem] = Field(default_factory=list, max_length=20)
    interests: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    location: str | None = Field(default=None, max_length=160)
    favorite_cities: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    tags: list[ProfileListItem] = Field(default_factory=list, max_length=20)
    personality_type: str | None = Field(default=None, max_length=40)
    personality_name: str | None = Field(default=None, max_length=80)
    personality_description: str | None = Field(default=None, max_length=1200)
    personality_portrait_media_id: uuid.UUID | None = None
    personality_test_date: date | None = None
    personality_energy_score: int | None = Field(default=None, ge=0, le=100)
    personality_mind_score: int | None = Field(default=None, ge=0, le=100)
    personality_nature_score: int | None = Field(default=None, ge=0, le=100)
    personality_tactics_score: int | None = Field(default=None, ge=0, le=100)
    personality_identity_score: int | None = Field(default=None, ge=0, le=100)
    personality_learn_more_url: HttpUrl | None = None
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
        "personality_name",
        "personality_description",
        "motto",
        "bio",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("personality_type")
    @classmethod
    def normalize_personality_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper() or None

    @field_validator("personality_test_date")
    @classmethod
    def validate_personality_test_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("人格测试日期不能晚于今天")
        return value

    @field_validator("interests", "favorite_cities", "tags")
    @classmethod
    def normalize_list(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))


class SiteProfileRead(SiteProfileUpdate):
    id: uuid.UUID | None = None
    avatar_public_url: str | None = None
    personality_portrait_public_url: str | None = None


class SiteSettingsUpdate(ApiModel):
    site_name: str | None = Field(default=None, max_length=100)
    logo_mode: Literal["TEXT", "IMAGE"] = "TEXT"
    logo_text: str | None = Field(default=None, max_length=100)
    logo_web_media_id: uuid.UUID | None = None
    logo_mobile_media_id: uuid.UUID | None = None
    logo_alt: str | None = Field(default=None, max_length=160)
    hero_eyebrow: str | None = Field(default=None, max_length=80)
    hero_title: str | None = Field(default=None, max_length=120)
    copyright_owner: str | None = Field(default=None, max_length=160)
    copyright_start_year: int | None = Field(default=None, ge=1900, le=2200)
    copyright_statement: str | None = Field(default=None, max_length=240)
    footer_notice: str | None = Field(default=None, max_length=320)
    icp_number: str | None = Field(default=None, max_length=160)
    police_record: str | None = Field(default=None, max_length=160)
    show_runtime_days: bool = True
    launch_date: date | None = None
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)
    og_image_media_id: uuid.UUID | None = None

    @field_validator(
        "site_name",
        "logo_text",
        "logo_alt",
        "hero_eyebrow",
        "hero_title",
        "copyright_owner",
        "copyright_statement",
        "footer_notice",
        "icp_number",
        "police_record",
        "seo_title",
        "seo_description",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def validate_logo(self) -> Self:
        if self.logo_mode == "IMAGE" and self.logo_web_media_id is None:
            raise ValueError("图片 Logo 模式必须上传 Web Logo")
        return self

    @field_validator("launch_date")
    @classmethod
    def validate_launch_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("上线日期不能晚于今天")
        return value


class SiteSettingsRead(SiteSettingsUpdate):
    id: uuid.UUID | None = None
    logo_web_public_url: str | None = None
    logo_mobile_public_url: str | None = None
    og_image_public_url: str | None = None


class SiteHistoryInput(ApiModel):
    event_date: date
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=1000)
    image_media_id: uuid.UUID | None = None

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("事件日期不能晚于今天")
        return value

    @field_validator("name", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("内容不能为空")
        return stripped


class SiteHistoryRead(SiteHistoryInput):
    id: uuid.UUID
    image_public_url: str | None = None
    image_width: int | None = None
    image_height: int | None = None


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
    settings: SiteSettingsRead
    history: list[SiteHistoryRead]
    contacts: list[ContactMethodRead]
    social_links: list[SocialLinkRead]


class VisitorEventInput(ApiModel):
    session_id: str = Field(min_length=8, max_length=64)
    path: str = Field(min_length=1, max_length=500)
    referrer: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    device_type: str = Field(default="unknown", max_length=32)
    browser: str = Field(default="unknown", max_length=64)
    os: str = Field(default="unknown", max_length=64)

    @field_validator("path", "session_id", "device_type", "browser", "os")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()


class VisitorTrendPoint(ApiModel):
    date: date
    page_views: int
    visitors: int


class VisitorStatsRead(ApiModel):
    range_days: int
    page_views: int
    visitors: int
    today_page_views: int
    today_visitors: int
    trend: list[VisitorTrendPoint]


class VisitorBreakdownItem(ApiModel):
    name: str
    count: int
    percentage: float


class VisitorAdminStatsRead(VisitorStatsRead):
    locations: list[VisitorBreakdownItem]
    countries: list[VisitorBreakdownItem]
    referrers: list[VisitorBreakdownItem]
    devices: list[VisitorBreakdownItem]
    pages: list[VisitorBreakdownItem]
