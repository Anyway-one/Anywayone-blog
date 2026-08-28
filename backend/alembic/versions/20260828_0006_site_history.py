"""Add site history events.

Revision ID: 20260828_0006
Revises: 20260828_0005
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260828_0006"
down_revision: str | Sequence[str] | None = "20260828_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "site_history_events",
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_media_id", postgresql.UUID(as_uuid=True), nullable=True),
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
            ["image_media_id"],
            ["media.id"],
            name="fk_site_history_events_image_media_id_media",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_site_history_events"),
    )
    op.create_index(
        op.f("ix_site_history_events_event_date"),
        "site_history_events",
        ["event_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_site_history_events_image_media_id"),
        "site_history_events",
        ["image_media_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_site_history_events_image_media_id"), table_name="site_history_events"
    )
    op.drop_index(op.f("ix_site_history_events_event_date"), table_name="site_history_events")
    op.drop_table("site_history_events")
