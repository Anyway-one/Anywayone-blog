import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UuidPrimaryKeyMixin
from app.db.enums import ContactType, SocialPlatform


class SiteProfile(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "site_profiles"

    singleton_key: Mapped[str] = mapped_column(
        String(20), default="primary", unique=True, nullable=False
    )
    avatar_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), index=True
    )
    public_name: Mapped[str | None] = mapped_column(String(100))
    expertise: Mapped[str | None] = mapped_column(String(160))
    occupation: Mapped[str | None] = mapped_column(String(160))
    zodiac_sign: Mapped[str | None] = mapped_column(String(20))
    chinese_zodiac: Mapped[str | None] = mapped_column(String(20))
    blood_type: Mapped[str | None] = mapped_column(String(10))
    interests: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    location: Mapped[str | None] = mapped_column(String(160))
    favorite_cities: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    personality_type: Mapped[str | None] = mapped_column(String(40))
    motto: Mapped[str | None] = mapped_column(String(240))
    bio: Mapped[str | None] = mapped_column(Text)


class SiteSettings(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "site_settings"

    singleton_key: Mapped[str] = mapped_column(
        String(20), default="primary", unique=True, nullable=False
    )
    launch_date: Mapped[date | None] = mapped_column(Date)


class SiteHistoryEvent(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "site_history_events"

    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), index=True
    )


class VisitorEvent(UuidPrimaryKeyMixin, Base):
    """An anonymized page view used for aggregate traffic reporting."""

    __tablename__ = "visitor_events"

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    referrer: Mapped[str | None] = mapped_column(String(500))
    country: Mapped[str | None] = mapped_column(String(120), index=True)
    region: Mapped[str | None] = mapped_column(String(120))
    city: Mapped[str | None] = mapped_column(String(120))
    device_type: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    browser: Mapped[str] = mapped_column(String(64), default="unknown", nullable=False)
    os: Mapped[str] = mapped_column(String(64), default="unknown", nullable=False)


class ContactMethod(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "contact_methods"

    contact_type: Mapped[ContactType] = mapped_column(
        Enum(ContactType, name="contact_type", native_enum=False), unique=True, nullable=False
    )
    value: Mapped[str] = mapped_column(String(320), nullable=False)
    qr_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SocialLink(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "social_links"

    platform: Mapped[SocialPlatform] = mapped_column(
        Enum(SocialPlatform, name="social_platform", native_enum=False),
        unique=True,
        nullable=False,
    )
    account_name: Mapped[str | None] = mapped_column(String(160))
    url: Mapped[str | None] = mapped_column(String(2048))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
