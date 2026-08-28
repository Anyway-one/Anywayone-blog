"""Add site profile, contact methods, and social links.

Revision ID: 20260828_0003
Revises: 20260827_0002
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260828_0003"
down_revision: str | Sequence[str] | None = "20260827_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "site_profiles",
        sa.Column("singleton_key", sa.String(length=20), nullable=False),
        sa.Column("avatar_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("public_name", sa.String(length=100), nullable=True),
        sa.Column("expertise", sa.String(length=160), nullable=True),
        sa.Column("occupation", sa.String(length=160), nullable=True),
        sa.Column("zodiac_sign", sa.String(length=20), nullable=True),
        sa.Column("chinese_zodiac", sa.String(length=20), nullable=True),
        sa.Column("blood_type", sa.String(length=10), nullable=True),
        sa.Column(
            "interests",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("location", sa.String(length=160), nullable=True),
        sa.Column(
            "favorite_cities",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("personality_type", sa.String(length=40), nullable=True),
        sa.Column("motto", sa.String(length=240), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
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
        sa.PrimaryKeyConstraint("id", name="pk_site_profiles"),
        sa.ForeignKeyConstraint(
            ["avatar_media_id"],
            ["media.id"],
            name="fk_site_profiles_avatar_media_id_media",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("singleton_key", name="uq_site_profiles_singleton_key"),
    )
    op.create_index("ix_site_profiles_avatar_media_id", "site_profiles", ["avatar_media_id"])
    op.create_table(
        "contact_methods",
        sa.Column("contact_type", sa.String(length=20), nullable=False),
        sa.Column("value", sa.String(length=320), nullable=False),
        sa.Column("qr_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
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
            ["qr_media_id"],
            ["media.id"],
            name="fk_contact_methods_qr_media_id_media",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_contact_methods"),
        sa.UniqueConstraint("contact_type", name="uq_contact_methods_contact_type"),
    )
    op.create_index("ix_contact_methods_qr_media_id", "contact_methods", ["qr_media_id"])
    op.create_table(
        "social_links",
        sa.Column("platform", sa.String(length=30), nullable=False),
        sa.Column("account_name", sa.String(length=160), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name="pk_social_links"),
        sa.UniqueConstraint("platform", name="uq_social_links_platform"),
    )


def downgrade() -> None:
    op.drop_table("social_links")
    op.drop_index("ix_contact_methods_qr_media_id", table_name="contact_methods")
    op.drop_table("contact_methods")
    op.drop_index("ix_site_profiles_avatar_media_id", table_name="site_profiles")
    op.drop_table("site_profiles")
