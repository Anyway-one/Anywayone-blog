"""Add temporary login lockout state and normalize the default slogan.

Revision ID: 20261125_0012
Revises: 20260903_0011
"""

import sqlalchemy as sa

from alembic import op

revision = "20261125_0012"
down_revision = "20260903_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.execute(
        sa.text(
            "UPDATE site_settings SET hero_title = :new_title WHERE hero_title = :old_title"
        ).bindparams(
            old_title="不设限，做唯一的自己。",
            new_title="不设限定，做唯一的自己。",
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE site_settings SET hero_title = :old_title WHERE hero_title = :new_title"
        ).bindparams(
            old_title="不设限，做唯一的自己。",
            new_title="不设限定，做唯一的自己。",
        )
    )
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
