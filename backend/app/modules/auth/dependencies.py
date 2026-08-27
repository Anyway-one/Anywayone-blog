from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.enums import UserStatus
from app.db.session import get_db_session
from app.modules.auth.models import User

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="请先登录后再继续。",
        )
    user_id = decode_access_token(credentials.credentials)
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None or user.status is not UserStatus.ACTIVE:
        raise AppError(
            status_code=401,
            code="SESSION_EXPIRED",
            message="登录状态已失效，请重新登录。",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
