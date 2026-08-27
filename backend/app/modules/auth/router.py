from fastapi import APIRouter, Cookie, Request, Response

from app.api.schemas import DataResponse, MessageData, Meta
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.request_id import get_request_id
from app.modules.auth import service
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.auth.schemas import LoginData, LoginInput, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


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
            user=UserRead.model_validate(user),
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
            user=UserRead.model_validate(user),
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
async def me(request: Request, current_user: CurrentUser) -> DataResponse[UserRead]:
    return DataResponse(
        data=UserRead.model_validate(current_user),
        meta=Meta(request_id=get_request_id(request)),
    )
