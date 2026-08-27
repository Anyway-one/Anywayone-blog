import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.schemas import DataResponse, Meta, PageMeta, PaginatedResponse
from app.core.request_id import get_request_id
from app.db.enums import PostStatus
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.posts import service
from app.modules.posts.schemas import (
    PostCreate,
    PostListItem,
    PostRead,
    PostUpdate,
    PublicationValidation,
    PublicPostListItem,
    PublicPostRead,
    RevisionInput,
)

admin_router = APIRouter(prefix="/admin/posts", tags=["admin-posts"])
public_router = APIRouter(prefix="/public/posts", tags=["public-posts"])

Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(alias="pageSize", ge=1, le=100)]
StatusFilter = Annotated[PostStatus | None, Query(alias="status")]
SearchQuery = Annotated[str | None, Query(alias="q", max_length=100)]


@admin_router.get("", response_model=PaginatedResponse[PostListItem])
async def list_posts(
    request: Request,
    db: DbSession,
    _: CurrentUser,
    page: Page = 1,
    page_size: PageSize = 20,
    post_status: StatusFilter = None,
    query: SearchQuery = None,
) -> PaginatedResponse[PostListItem]:
    posts, total, total_pages = await service.list_admin_posts(
        db,
        page=page,
        page_size=page_size,
        status=post_status,
        query=query,
    )
    return PaginatedResponse(
        data=[PostListItem.model_validate(post) for post in posts],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            request_id=get_request_id(request),
        ),
    )


@admin_router.post(
    "",
    response_model=DataResponse[PostRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    payload: PostCreate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[PostRead]:
    post = await service.create_post(
        db,
        author=current_user,
        payload=payload,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=PostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("/{post_id}", response_model=DataResponse[PostRead])
async def get_post(
    post_id: uuid.UUID,
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[PostRead]:
    post = await service.get_admin_post(db, post_id)
    return DataResponse(
        data=PostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/{post_id}", response_model=DataResponse[PostRead])
async def update_post(
    post_id: uuid.UUID,
    payload: PostUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[PostRead]:
    post = await service.update_post(
        db,
        post_id=post_id,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=PostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post(
    "/{post_id}/validate-publication",
    response_model=DataResponse[PublicationValidation],
)
async def validate_post_publication(
    post_id: uuid.UUID,
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[PublicationValidation]:
    post = await service.get_admin_post(db, post_id)
    return DataResponse(
        data=service.validate_publication(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post("/{post_id}/publish", response_model=DataResponse[PostRead])
async def publish_post(
    post_id: uuid.UUID,
    payload: RevisionInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[PostRead]:
    post = await service.publish_post(
        db,
        post_id=post_id,
        revision=payload.revision,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=PostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post("/{post_id}/withdraw", response_model=DataResponse[PostRead])
async def withdraw_post(
    post_id: uuid.UUID,
    payload: RevisionInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[PostRead]:
    post = await service.withdraw_post(
        db,
        post_id=post_id,
        revision=payload.revision,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=PostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get("", response_model=PaginatedResponse[PublicPostListItem])
async def list_public_posts(
    request: Request,
    db: DbSession,
    page: Page = 1,
    page_size: PageSize = 20,
) -> PaginatedResponse[PublicPostListItem]:
    posts, total, total_pages = await service.list_public_posts(
        db,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        data=[PublicPostListItem.model_validate(post) for post in posts],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            request_id=get_request_id(request),
        ),
    )


@public_router.get("/{slug}", response_model=DataResponse[PublicPostRead])
async def get_public_post(
    slug: str,
    request: Request,
    db: DbSession,
) -> DataResponse[PublicPostRead]:
    post = await service.get_public_post(db, slug)
    return DataResponse(
        data=PublicPostRead.model_validate(post),
        meta=Meta(request_id=get_request_id(request)),
    )
