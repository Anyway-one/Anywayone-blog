"""Add configurable profile equipment cards.

Revision ID: 20260829_0010
Revises: 20260829_0009
Create Date: 2026-08-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260829_0010"
down_revision: str | Sequence[str] | None = "20260829_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "site_profiles",
        sa.Column(
            "equipment",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("site_profiles", "equipment")
