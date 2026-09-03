"""Add media category for asset organization.

Revision ID: 20260903_0011
Revises: 20260829_0010
"""

import sqlalchemy as sa

from alembic import op

revision = "20260903_0011"
down_revision = "20260829_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "media",
        sa.Column("category", sa.String(length=32), nullable=False, server_default="general"),
    )
    op.create_index("ix_media_category", "media", ["category"])
    op.alter_column("media", "category", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_media_category", table_name="media")
    op.drop_column("media", "category")
