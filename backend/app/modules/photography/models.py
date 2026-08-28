import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UuidPrimaryKeyMixin
from app.db.enums import PhotographyStatus

if TYPE_CHECKING:
    from app.modules.media.models import Media


class PhotoCollection(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "photo_collections"
    __table_args__ = (
        Index(
            "uq_photo_collections_active_slug",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_photo_collections_status_published", "status", text("published_at DESC")),
    )

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), index=True
    )
    captured_from: Mapped[date | None] = mapped_column(Date)
    captured_to: Mapped[date | None] = mapped_column(Date)
    location_text: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[PhotographyStatus] = mapped_column(
        Enum(PhotographyStatus, name="photography_status", native_enum=False),
        default=PhotographyStatus.DRAFT,
        nullable=False,
        index=True,
    )
    allow_indexing: Mapped[bool] = mapped_column(default=True, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    cover_media: Mapped["Media | None"] = relationship(lazy="selectin")
    items: Mapped[list["PhotoItem"]] = relationship(
        back_populates="collection",
        cascade="all, delete-orphan",
        order_by="PhotoItem.position",
        lazy="selectin",
    )


class PhotoItem(UuidPrimaryKeyMixin, Base):
    __tablename__ = "photo_items"
    __table_args__ = (
        UniqueConstraint("collection_id", "position", name="uq_photo_items_collection_position"),
        UniqueConstraint("collection_id", "media_id", name="uq_photo_items_collection_media"),
    )

    collection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("photo_collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    alt_text: Mapped[str | None] = mapped_column(String(320))
    caption: Mapped[str | None] = mapped_column(Text)

    collection: Mapped[PhotoCollection] = relationship(back_populates="items")
    media: Mapped["Media"] = relationship(lazy="joined")
