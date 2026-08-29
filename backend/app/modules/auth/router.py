import uuid

from fastapi import APIRouter, Cookie, Request, Response

from app.api.schemas import DataResponse, MessageData, Meta
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.request_id import get_request_id
from app.modules.auth import service
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    LoginData,
    LoginInput,
    UserAdminRead,
    UserCreateInput,
    UserProfileUpdate,
    UserRead,
    UserUpdateInput,
)

router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(prefix="/admin/users", tags=["admin-users"])


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key="anywayone_refresh",
        value=token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/login", response_model=DataResponse[LoginData])
async def login(
    payload: LoginInput,
    request: Request,
    response: Response,
    db: DbSession,
) -> DataResponse[LoginData]:
    user, access_token, refresh_token, expires_in = await service.authenticate(
        db,
        email=str(payload.email),
        password=payload.password,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_refresh_cookie(response, refresh_token)
    return DataResponse(
        data=LoginData(
            access_token=access_token,
            expires_in=expires_in,
            user=await service.user_read(db, user),
        ),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.post("/refresh", response_model=DataResponse[LoginData])
async def refresh(
    request: Request,
    response: Response,
    db: DbSession,
    anywayone_refresh: str | None = Cookie(default=None),
) -> DataResponse[LoginData]:
    if not anywayone_refresh:
        raise AppError(
            status_code=401,
            code="SESSION_EXPIRED",
            message="登录状态已失效，请重新登录。",
        )
    user, access_token, refresh_token, expires_in = await service.rotate_refresh_token(
        db,
        refresh_token=anywayone_refresh,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_refresh_cookie(response, refresh_token)
    return DataResponse(
        data=LoginData(
            access_token=access_token,
            expires_in=expires_in,
            user=await service.user_read(db, user),
        ),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.post("/logout", response_model=DataResponse[MessageData])
async def logout(
    request: Request,
    response: Response,
    db: DbSession,
    anywayone_refresh: str | None = Cookie(default=None),
) -> DataResponse[MessageData]:
    await service.revoke_refresh_token(db, anywayone_refresh)
    response.delete_cookie(
        "anywayone_refresh",
        path=f"{get_settings().api_v1_prefix}/auth",
    )
    return DataResponse(
        data=MessageData(message="已退出登录。"),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.get("/me", response_model=DataResponse[UserRead])
async def me(request: Request, db: DbSession, current_user: CurrentUser) -> DataResponse[UserRead]:
    return DataResponse(
        data=await service.user_read(db, current_user),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.patch("/me", response_model=DataResponse[UserRead])
async def update_me(
    payload: UserProfileUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[UserRead]:
    user = await service.update_avatar(db, current_user, payload.avatar_media_id)
    return DataResponse(
        data=await service.user_read(db, user),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("", response_model=DataResponse[list[UserAdminRead]])
async def get_users(
    request: Request, db: DbSession, _: CurrentUser
) -> DataResponse[list[UserAdminRead]]:
    return DataResponse(
        data=await service.list_users(db), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.post("", response_model=DataResponse[UserAdminRead], status_code=201)
async def create_admin_user(
    payload: UserCreateInput,
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[UserAdminRead]:
    user = await service.create_user(
        db,
        email=str(payload.email),
        display_name=payload.display_name,
        password=payload.password,
    )
    return DataResponse(
        data=await service.user_admin_read(db, user),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/{user_id}", response_model=DataResponse[UserAdminRead])
async def update_admin_user(
    user_id: uuid.UUID,
    payload: UserUpdateInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[UserAdminRead]:
    user = await db.get(User, user_id)
    if user is None:
        raise AppError(status_code=404, code="USER_NOT_FOUND", message="用户不存在。")
    updated = await service.update_user(
        db,
        user=user,
        actor=current_user,
        email=str(payload.email) if payload.email is not None else None,
        display_name=payload.display_name,
        password=payload.password,
        status=payload.status,
    )
    return DataResponse(
        data=await service.user_admin_read(db, updated),
        meta=Meta(request_id=get_request_id(request)),
    )
