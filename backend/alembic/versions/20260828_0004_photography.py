"""Add photography collections and ordered photo items.

Revision ID: 20260828_0004
Revises: 20260828_0003
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260828_0004"
down_revision: str | Sequence[str] | None = "20260828_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamp_columns() -> list[sa.Column[object]]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "photo_collections",
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("captured_from", sa.Date(), nullable=True),
        sa.Column("captured_to", sa.Date(), nullable=True),
        sa.Column("location_text", sa.String(length=200), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT", "PUBLISHED", "WITHDRAWN", name="photography_status", native_enum=False
            ),
            nullable=False,
        ),
        sa.Column("allow_indexing", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["cover_media_id"], ["media.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_photo_collections_author_id", "photo_collections", ["author_id"])
    op.create_index("ix_photo_collections_cover_media_id", "photo_collections", ["cover_media_id"])
    op.create_index("ix_photo_collections_status", "photo_collections", ["status"])
    op.create_index("ix_photo_collections_deleted_at", "photo_collections", ["deleted_at"])
    op.create_index(
        "uq_photo_collections_active_slug",
        "photo_collections",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_photo_collections_status_published",
        "photo_collections",
        ["status", sa.text("published_at DESC")],
    )

    op.create_table(
        "photo_items",
        sa.Column("collection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("alt_text", sa.String(length=320), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["collection_id"], ["photo_collections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("collection_id", "position", name="uq_photo_items_collection_position"),
        sa.UniqueConstraint("collection_id", "media_id", name="uq_photo_items_collection_media"),
    )
    op.create_index("ix_photo_items_collection_id", "photo_items", ["collection_id"])
    op.create_index("ix_photo_items_media_id", "photo_items", ["media_id"])


def downgrade() -> None:
    op.drop_index("ix_photo_items_media_id", table_name="photo_items")
    op.drop_index("ix_photo_items_collection_id", table_name="photo_items")
    op.drop_table("photo_items")
    op.drop_index("ix_photo_collections_status_published", table_name="photo_collections")
    op.drop_index("uq_photo_collections_active_slug", table_name="photo_collections")
    op.drop_index("ix_photo_collections_deleted_at", table_name="photo_collections")
    op.drop_index("ix_photo_collections_status", table_name="photo_collections")
    op.drop_index("ix_photo_collections_cover_media_id", table_name="photo_collections")
    op.drop_index("ix_photo_collections_author_id", table_name="photo_collections")
    op.drop_table("photo_collections")
