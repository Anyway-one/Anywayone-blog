"""Add article cover media.

Revision ID: 20260827_0002
Revises: 20260827_0001
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260827_0002"
down_revision: str | Sequence[str] | None = "20260827_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_key", sa.String(length=255), nullable=False),
        sa.Column("public_url", sa.String(length=2048), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("alt_text", sa.String(length=320), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name="fk_media_owner_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_media"),
        sa.UniqueConstraint("object_key", name="uq_media_object_key"),
    )
    op.create_index("ix_media_owner_id", "media", ["owner_id"])
    op.create_index("ix_media_deleted_at", "media", ["deleted_at"])
    op.add_column(
        "posts",
        sa.Column("cover_media_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("posts", sa.Column("cover_alt", sa.String(length=320), nullable=True))
    op.create_foreign_key(
        "fk_posts_cover_media_id_media",
        "posts",
        "media",
        ["cover_media_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_posts_cover_media_id", "posts", ["cover_media_id"])


def downgrade() -> None:
    op.drop_index("ix_posts_cover_media_id", table_name="posts")
    op.drop_constraint("fk_posts_cover_media_id_media", "posts", type_="foreignkey")
    op.drop_column("posts", "cover_alt")
    op.drop_column("posts", "cover_media_id")
    op.drop_table("media")
