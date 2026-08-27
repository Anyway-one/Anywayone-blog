import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine


async def check_database() -> None:
    async with engine.connect() as connection:
        version = (await connection.execute(text("SHOW server_version_num"))).scalar_one()
        tables = (
            await connection.execute(
                text(
                    "SELECT tablename FROM pg_catalog.pg_tables "
                    "WHERE schemaname = :schema ORDER BY tablename"
                ),
                {"schema": "public"},
            )
        ).scalars()
        print(
            {
                "connected": True,
                "serverMajor": int(version) // 10000,
                "publicTables": list(tables),
            }
        )
    await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(check_database())
    except SQLAlchemyError:
        print("Database connection failed. Check network, SSL mode, and credentials.")
        sys.exit(1)
