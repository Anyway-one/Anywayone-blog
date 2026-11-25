import subprocess
import sys

from app.db.base import Base
from app.main import api


def test_application_registers_all_foreign_key_targets() -> None:
    assert api.title
    for table in Base.metadata.tables.values():
        for foreign_key in table.foreign_keys:
            assert foreign_key.column.table.name in Base.metadata.tables


def test_cli_registers_complete_model_metadata_in_fresh_process() -> None:
    script = """
from app.db.base import Base
import app.cli

assert {"users", "media"} <= set(Base.metadata.tables)
for table in Base.metadata.tables.values():
    for foreign_key in table.foreign_keys:
        foreign_key.column.table
"""
    result = subprocess.run(  # noqa: S603
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, (
        f"CLI model registration failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )
