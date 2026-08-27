import argparse
import asyncio
import getpass
import sys
from dataclasses import dataclass
from typing import cast

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import hash_password, normalize_email
from app.db.session import AsyncSessionFactory, close_database
from app.modules.auth.models import User


@dataclass(frozen=True)
class AdminCredentials:
    email: str
    display_name: str
    password: str


def prompt_admin_credentials() -> AdminCredentials | None:
    email_input = input("Administrator email: ").strip()
    display_name = input("Display name: ").strip()
    password = getpass.getpass("Password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    try:
        email = cast(str, TypeAdapter(EmailStr).validate_python(email_input))
    except ValidationError:
        print("Invalid email address.")
        return None
    if not display_name:
        print("Display name is required.")
        return None
    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return None
    if password != confirmation:
        print("Passwords do not match.")
        return None
    return AdminCredentials(email=email, display_name=display_name, password=password)


async def create_admin(credentials: AdminCredentials) -> None:

    try:
        async with AsyncSessionFactory() as session:
            normalized_email = normalize_email(credentials.email)
            existing = await session.scalar(select(User.id).where(User.email == normalized_email))
            if existing is not None:
                print("An administrator with this email already exists.")
                return
            session.add(
                User(
                    email=normalized_email,
                    display_name=credentials.display_name,
                    password_hash=hash_password(credentials.password),
                )
            )
            await session.commit()
    except SQLAlchemyError:
        print("Could not create administrator. Check database connectivity and migrations.")
        sys.exit(1)
    finally:
        await close_database()
    print("Administrator created.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="anywayone-backend")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("create-admin", help="Create the first administrator")
    arguments = parser.parse_args()
    if arguments.command == "create-admin":
        credentials = prompt_admin_credentials()
        if credentials is not None:
            asyncio.run(create_admin(credentials))


if __name__ == "__main__":
    main()
