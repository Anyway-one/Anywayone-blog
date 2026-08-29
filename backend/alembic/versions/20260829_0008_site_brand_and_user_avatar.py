"""Add configurable site brand content and user avatars.

Revision ID: 20260829_0008
Revises: 20260828_0007
Create Date: 2026-08-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260829_0008"
down_revision: str | Sequence[str] | None = "20260828_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_media_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_users_avatar_media_id", "users", ["avatar_media_id"], unique=False)
    op.create_foreign_key(
        "fk_users_avatar_media_id_media",
        "users",
        "media",
        ["avatar_media_id"],
        ["id"],
        ondelete="SET NULL",
    )

    columns = [
        sa.Column("site_name", sa.String(length=100), nullable=True),
        sa.Column("logo_mode", sa.String(length=16), server_default="TEXT", nullable=False),
        sa.Column("logo_text", sa.String(length=100), nullable=True),
        sa.Column("logo_web_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("logo_mobile_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("logo_alt", sa.String(length=160), nullable=True),
        sa.Column("hero_eyebrow", sa.String(length=80), nullable=True),
        sa.Column("hero_title", sa.String(length=120), nullable=True),
        sa.Column("copyright_owner", sa.String(length=160), nullable=True),
        sa.Column("copyright_start_year", sa.Integer(), nullable=True),
        sa.Column("copyright_statement", sa.String(length=240), nullable=True),
        sa.Column("footer_notice", sa.String(length=320), nullable=True),
        sa.Column("icp_number", sa.String(length=160), nullable=True),
        sa.Column("police_record", sa.String(length=160), nullable=True),
        sa.Column("show_runtime_days", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("seo_title", sa.String(length=200), nullable=True),
        sa.Column("seo_description", sa.String(length=320), nullable=True),
        sa.Column("og_image_media_id", postgresql.UUID(as_uuid=True), nullable=True),
    ]
    for column in columns:
        op.add_column("site_settings", column)

    for column_name in ("logo_web_media_id", "logo_mobile_media_id", "og_image_media_id"):
        op.create_index(
            f"ix_site_settings_{column_name}", "site_settings", [column_name], unique=False
        )
        op.create_foreign_key(
            f"fk_site_settings_{column_name}_media",
            "site_settings",
            "media",
            [column_name],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    for column_name in ("logo_web_media_id", "logo_mobile_media_id", "og_image_media_id"):
        op.drop_constraint(
            f"fk_site_settings_{column_name}_media", "site_settings", type_="foreignkey"
        )
        op.drop_index(f"ix_site_settings_{column_name}", table_name="site_settings")
        op.drop_column("site_settings", column_name)

    for column_name in (
        "og_image_media_id",
        "seo_description",
        "seo_title",
        "show_runtime_days",
        "police_record",
        "icp_number",
        "footer_notice",
        "copyright_statement",
        "copyright_start_year",
        "copyright_owner",
        "hero_title",
        "hero_eyebrow",
        "logo_alt",
        "logo_mobile_media_id",
        "logo_web_media_id",
        "logo_text",
        "logo_mode",
        "site_name",
    ):
        if column_name in {"logo_web_media_id", "logo_mobile_media_id", "og_image_media_id"}:
            continue
        op.drop_column("site_settings", column_name)

    op.drop_constraint("fk_users_avatar_media_id_media", "users", type_="foreignkey")
    op.drop_index("ix_users_avatar_media_id", table_name="users")
    op.drop_column("users", "avatar_media_id")
