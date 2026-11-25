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
from app.db import models as db_models
from app.db.enums import UserStatus
from app.db.session import AsyncSessionFactory, close_database
from app.modules.auth.models import User

db_models.register_models()


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


async def unlock_admin(email: str) -> None:
    try:
        async with AsyncSessionFactory() as session:
            user = await session.scalar(
                select(User).where(User.email == normalize_email(email)).with_for_update()
            )
            if user is None:
                print("Administrator not found.")
                return
            if user.status is not UserStatus.LOCKED:
                print("Administrator is not locked.")
                return
            user.status = UserStatus.ACTIVE
            user.failed_login_attempts = 0
            user.locked_until = None
            await session.commit()
    except SQLAlchemyError:
        print("Could not unlock administrator. Check database connectivity and migrations.")
        sys.exit(1)
    finally:
        await close_database()
    print("Administrator unlocked.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="anywayone-backend")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("create-admin", help="Create the first administrator")
    unlock_parser = subcommands.add_parser("unlock-admin", help="Unlock an administrator")
    unlock_parser.add_argument("email", help="Administrator email address")
    arguments = parser.parse_args()
    if arguments.command == "create-admin":
        credentials = prompt_admin_credentials()
        if credentials is not None:
            asyncio.run(create_admin(credentials))
    elif arguments.command == "unlock-admin":
        asyncio.run(unlock_admin(arguments.email))


if __name__ == "__main__":
    main()
