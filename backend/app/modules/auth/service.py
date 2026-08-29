import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_ip,
    hash_password,
    hash_refresh_token,
    normalize_email,
    verify_dummy_password,
    verify_password,
)
from app.db.enums import UserStatus
from app.modules.auth.models import Session, User
from app.modules.auth.schemas import UserAdminRead, UserRead
from app.modules.media.models import Media


async def user_read(db: AsyncSession, user: User) -> UserRead:
    avatar = None
    if user.avatar_media_id:
        avatar = await db.scalar(
            select(Media).where(Media.id == user.avatar_media_id, Media.deleted_at.is_(None))
        )
    return UserRead.model_validate(
        {
            **user.__dict__,
            "avatar_public_url": avatar.public_url if avatar else None,
        }
    )


async def user_admin_read(db: AsyncSession, user: User) -> UserAdminRead:
    avatar = None
    if user.avatar_media_id:
        avatar = await db.scalar(
            select(Media).where(Media.id == user.avatar_media_id, Media.deleted_at.is_(None))
        )
    return UserAdminRead.model_validate(
        {
            **user.__dict__,
            "avatar_public_url": avatar.public_url if avatar else None,
        }
    )


async def list_users(db: AsyncSession) -> list[UserAdminRead]:
    users = (await db.scalars(select(User).order_by(User.created_at.desc()))).all()
    return [await user_admin_read(db, user) for user in users]


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    display_name: str,
    password: str,
) -> User:
    normalized_email = normalize_email(email)
    existing = await db.scalar(select(User.id).where(User.email == normalized_email))
    if existing is not None:
        raise AppError(status_code=409, code="EMAIL_ALREADY_EXISTS", message="该邮箱已被使用。")
    user = User(
        email=normalized_email,
        display_name=display_name.strip(),
        password_hash=hash_password(password),
        password_changed_at=datetime.now(UTC),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    *,
    user: User,
    email: str | None,
    display_name: str | None,
    password: str | None,
    status: UserStatus | None,
    actor: User,
) -> User:
    if email is not None:
        normalized_email = normalize_email(email)
        existing = await db.scalar(
            select(User.id).where(User.email == normalized_email, User.id != user.id)
        )
        if existing is not None:
            raise AppError(status_code=409, code="EMAIL_ALREADY_EXISTS", message="该邮箱已被使用。")
        user.email = normalized_email
    if display_name is not None:
        user.display_name = display_name.strip()
    if password is not None:
        user.password_hash = hash_password(password)
        user.password_changed_at = datetime.now(UTC)
        await db.execute(
            update(Session)
            .where(Session.user_id == user.id, Session.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
    if status is not None and status != user.status:
        if user.id == actor.id and status is not UserStatus.ACTIVE:
            raise AppError(
                status_code=422,
                code="CANNOT_DISABLE_SELF",
                message="不能停用当前登录账号。",
            )
        if status is not UserStatus.ACTIVE:
            active_count = await db.scalar(
                select(func.count(User.id)).where(User.status == UserStatus.ACTIVE)
            )
            if active_count is not None and active_count <= 1:
                raise AppError(
                    status_code=422,
                    code="LAST_ACTIVE_USER",
                    message="至少需要保留一个启用中的账号。",
                )
            await db.execute(
                update(Session)
                .where(Session.user_id == user.id, Session.revoked_at.is_(None))
                .values(revoked_at=datetime.now(UTC))
            )
        user.status = status
    await db.commit()
    await db.refresh(user)
    return user


async def update_avatar(db: AsyncSession, user: User, avatar_media_id: uuid.UUID | None) -> User:
    if avatar_media_id is not None:
        media = await db.scalar(
            select(Media).where(Media.id == avatar_media_id, Media.deleted_at.is_(None))
        )
        if media is None:
            raise AppError(status_code=422, code="MEDIA_NOT_FOUND", message="图片不存在。")
    user.avatar_media_id = avatar_media_id
    await db.commit()
    await db.refresh(user)
    return user


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
