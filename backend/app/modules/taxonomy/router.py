import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.schemas import DataResponse, Meta, PageMeta, PaginatedResponse
from app.core.request_id import get_request_id
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.posts import service as post_service
from app.modules.posts.schemas import PublicPostListItem
from app.modules.taxonomy import service
from app.modules.taxonomy.models import Category, Tag
from app.modules.taxonomy.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    TagMergeInput,
    TaxonomyCreate,
    TaxonomyMutationResult,
    TaxonomyRead,
    TaxonomyUpdate,
)

admin_router = APIRouter(prefix="/admin", tags=["admin-taxonomy"])
public_router = APIRouter(prefix="/public", tags=["public-taxonomy"])
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(alias="pageSize", ge=1, le=100)]


def category_read(item: Category, post_count: int) -> CategoryRead:
    return CategoryRead.model_validate({**item.__dict__, "post_count": post_count})


def tag_read(item: Tag, post_count: int) -> TaxonomyRead:
    return TaxonomyRead.model_validate({**item.__dict__, "post_count": post_count})


@admin_router.get("/categories", response_model=DataResponse[list[CategoryRead]])
async def list_admin_categories(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[list[CategoryRead]]:
    items = await service.list_categories(db)
    return DataResponse(
        data=[category_read(item, count) for item, count in items],
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post(
    "/categories",
    response_model=DataResponse[CategoryRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: CategoryCreate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[CategoryRead]:
    item = await service.create_category(
        db,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(data=category_read(item, 0), meta=Meta(request_id=get_request_id(request)))


@admin_router.patch("/categories/{category_id}", response_model=DataResponse[CategoryRead])
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[CategoryRead]:
    item = await service.update_category(
        db,
        category_id,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    count = next(
        (count for current, count in await service.list_categories(db) if current.id == item.id), 0
    )
    return DataResponse(
        data=category_read(item, count), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.delete(
    "/categories/{category_id}",
    response_model=DataResponse[TaxonomyMutationResult],
)
async def delete_category(
    category_id: uuid.UUID,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[TaxonomyMutationResult]:
    affected = await service.delete_category(
        db,
        category_id,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=TaxonomyMutationResult(affected_posts=affected),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("/tags", response_model=DataResponse[list[TaxonomyRead]])
async def list_admin_tags(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[list[TaxonomyRead]]:
    items = await service.list_tags(db)
    return DataResponse(
        data=[tag_read(item, count) for item, count in items],
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post(
    "/tags",
    response_model=DataResponse[TaxonomyRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_tag(
    payload: TaxonomyCreate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[TaxonomyRead]:
    item = await service.create_tag(
        db,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(data=tag_read(item, 0), meta=Meta(request_id=get_request_id(request)))


@admin_router.patch("/tags/{tag_id}", response_model=DataResponse[TaxonomyRead])
async def update_tag(
    tag_id: uuid.UUID,
    payload: TaxonomyUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[TaxonomyRead]:
    item = await service.update_tag(
        db,
        tag_id,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    count = next(
        (count for current, count in await service.list_tags(db) if current.id == item.id), 0
    )
    return DataResponse(data=tag_read(item, count), meta=Meta(request_id=get_request_id(request)))


@admin_router.delete("/tags/{tag_id}", response_model=DataResponse[TaxonomyMutationResult])
async def delete_tag(
    tag_id: uuid.UUID,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[TaxonomyMutationResult]:
    affected = await service.delete_tag(
        db,
        tag_id,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=TaxonomyMutationResult(affected_posts=affected),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post("/tags/{tag_id}/merge", response_model=DataResponse[TaxonomyMutationResult])
async def merge_tag(
    tag_id: uuid.UUID,
    payload: TagMergeInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[TaxonomyMutationResult]:
    affected = await service.merge_tag(
        db,
        tag_id,
        payload.target_tag_id,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=TaxonomyMutationResult(affected_posts=affected),
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get("/categories", response_model=DataResponse[list[CategoryRead]])
async def list_public_categories(
    request: Request,
    db: DbSession,
) -> DataResponse[list[CategoryRead]]:
    items = await service.list_categories(db, public_only=True)
    return DataResponse(
        data=[category_read(item, count) for item, count in items],
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get("/tags", response_model=DataResponse[list[TaxonomyRead]])
async def list_public_tags(
    request: Request,
    db: DbSession,
) -> DataResponse[list[TaxonomyRead]]:
    items = await service.list_tags(db, public_only=True)
    return DataResponse(
        data=[tag_read(item, count) for item, count in items],
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get(
    "/categories/{slug}/posts",
    response_model=PaginatedResponse[PublicPostListItem],
)
async def list_category_posts(
    slug: str,
    request: Request,
    db: DbSession,
    page: Page = 1,
    page_size: PageSize = 20,
) -> PaginatedResponse[PublicPostListItem]:
    category = await service.get_public_category_by_slug(db, slug)
    posts, total, total_pages = await post_service.list_public_posts(
        db,
        page=page,
        page_size=page_size,
        category_id=category.id,
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


@public_router.get("/tags/{slug}/posts", response_model=PaginatedResponse[PublicPostListItem])
async def list_tag_posts(
    slug: str,
    request: Request,
    db: DbSession,
    page: Page = 1,
    page_size: PageSize = 20,
) -> PaginatedResponse[PublicPostListItem]:
    tag = await service.get_public_tag_by_slug(db, slug)
    posts, total, total_pages = await post_service.list_public_posts(
        db,
        page=page,
        page_size=page_size,
        tag_id=tag.id,
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
