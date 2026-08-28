"""Add anonymized visitor events."""

from collections.abc import Sequence
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "20260828_0007"
down_revision: str | Sequence[str] | None = "20260828_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "visitor_events",
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("country", sa.String(length=120), nullable=True),
        sa.Column("region", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("device_type", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("browser", sa.String(length=64), nullable=False, server_default="unknown"),
        sa.Column("os", sa.String(length=64), nullable=False, server_default="unknown"),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_visitor_events"),
    )
    op.create_index("ix_visitor_events_occurred_at", "visitor_events", ["occurred_at"])
    op.create_index("ix_visitor_events_session_id", "visitor_events", ["session_id"])
    op.create_index("ix_visitor_events_country", "visitor_events", ["country"])


def downgrade() -> None:
    op.drop_index("ix_visitor_events_country", table_name="visitor_events")
    op.drop_index("ix_visitor_events_session_id", table_name="visitor_events")
    op.drop_index("ix_visitor_events_occurred_at", table_name="visitor_events")
    op.drop_table("visitor_events")
