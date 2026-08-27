import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_ip,
    hash_refresh_token,
    normalize_email,
    verify_dummy_password,
    verify_password,
)
from app.db.enums import UserStatus
from app.modules.auth.models import Session, User


async def authenticate(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    user_agent: str | None,
    ip_address: str | None,
) -> tuple[User, str, str, int]:
    user = await db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        verify_dummy_password(password)
    if (
        user is None
        or user.status is not UserStatus.ACTIVE
        or not verify_password(password, user.password_hash)
    ):
        raise AppError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="邮箱或密码不正确。",
        )

    refresh_token = create_refresh_token()
    expires_at = datetime.now(UTC) + timedelta(days=get_settings().refresh_token_expire_days)
    session = Session(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        token_family=uuid.uuid4(),
        user_agent=user_agent[:500] if user_agent else None,
        ip_hash=hash_ip(ip_address),
        expires_at=expires_at,
    )
    user.last_login_at = datetime.now(UTC)
    db.add(session)
    await db.commit()
    access_token, expires_in = create_access_token(user.id)
    return user, access_token, refresh_token, expires_in


async def rotate_refresh_token(
    db: AsyncSession,
    *,
    refresh_token: str,
    user_agent: str | None,
    ip_address: str | None,
) -> tuple[User, str, str, int]:
    now = datetime.now(UTC)
    token_hash = hash_refresh_token(refresh_token)
    session = await db.scalar(select(Session).where(Session.token_hash == token_hash))
    if session is None:
        raise _expired_session_error()
    if session.revoked_at is not None:
        await db.execute(
            update(Session)
            .where(Session.token_family == session.token_family, Session.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await db.commit()
        raise _expired_session_error()
    if session.expires_at <= now:
        session.revoked_at = now
        await db.commit()
        raise _expired_session_error()

    user = await db.get(User, session.user_id)
    if user is None or user.status is not UserStatus.ACTIVE:
        session.revoked_at = now
        await db.commit()
        raise _expired_session_error()

    session.revoked_at = now
    session.last_used_at = now
    next_refresh_token = create_refresh_token()
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_refresh_token(next_refresh_token),
            token_family=session.token_family,
            user_agent=user_agent[:500] if user_agent else None,
            ip_hash=hash_ip(ip_address),
            expires_at=now + timedelta(days=get_settings().refresh_token_expire_days),
        )
    )
    await db.commit()
    access_token, expires_in = create_access_token(user.id)
    return user, access_token, next_refresh_token, expires_in


async def revoke_refresh_token(db: AsyncSession, refresh_token: str | None) -> None:
    if not refresh_token:
        return
    session = await db.scalar(
        select(Session).where(Session.token_hash == hash_refresh_token(refresh_token))
    )
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        await db.commit()


def _expired_session_error() -> AppError:
    return AppError(
        status_code=401,
        code="SESSION_EXPIRED",
        message="登录状态已失效，请重新登录。",
    )
