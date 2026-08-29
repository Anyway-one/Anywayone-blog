"""Add the configurable profile personality card.

Revision ID: 20260829_0009
Revises: 20260829_0008
Create Date: 2026-08-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260829_0009"
down_revision: str | Sequence[str] | None = "20260829_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("site_profiles", sa.Column("personality_name", sa.String(80)))
    op.add_column("site_profiles", sa.Column("personality_description", sa.Text()))
    op.add_column(
        "site_profiles",
        sa.Column("personality_portrait_media_id", postgresql.UUID(as_uuid=True)),
    )
    op.add_column("site_profiles", sa.Column("personality_test_date", sa.Date()))
    for column_name in (
        "personality_energy_score",
        "personality_mind_score",
        "personality_nature_score",
        "personality_tactics_score",
        "personality_identity_score",
    ):
        op.add_column("site_profiles", sa.Column(column_name, sa.Integer()))
        op.create_check_constraint(
            f"ck_site_profiles_{column_name}_range",
            "site_profiles",
            f"{column_name} IS NULL OR {column_name} BETWEEN 0 AND 100",
        )
    op.add_column("site_profiles", sa.Column("personality_learn_more_url", sa.String(2048)))
    op.create_index(
        "ix_site_profiles_personality_portrait_media_id",
        "site_profiles",
        ["personality_portrait_media_id"],
    )
    op.create_foreign_key(
        "fk_site_profiles_personality_portrait_media_id_media",
        "site_profiles",
        "media",
        ["personality_portrait_media_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_site_profiles_personality_portrait_media_id_media",
        "site_profiles",
        type_="foreignkey",
    )
    op.drop_index("ix_site_profiles_personality_portrait_media_id", table_name="site_profiles")
    op.drop_column("site_profiles", "personality_learn_more_url")
    for column_name in (
        "personality_identity_score",
        "personality_tactics_score",
        "personality_nature_score",
        "personality_mind_score",
        "personality_energy_score",
    ):
        op.drop_constraint(
            f"ck_site_profiles_{column_name}_range",
            "site_profiles",
            type_="check",
        )
        op.drop_column("site_profiles", column_name)
    op.drop_column("site_profiles", "personality_test_date")
    op.drop_column("site_profiles", "personality_portrait_media_id")
    op.drop_column("site_profiles", "personality_description")
    op.drop_column("site_profiles", "personality_name")
