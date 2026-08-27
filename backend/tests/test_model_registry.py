from app.db.base import Base
from app.main import api


def test_application_registers_all_foreign_key_targets() -> None:
    assert api.title
    for table in Base.metadata.tables.values():
        for foreign_key in table.foreign_keys:
            assert foreign_key.column.table.name in Base.metadata.tables
