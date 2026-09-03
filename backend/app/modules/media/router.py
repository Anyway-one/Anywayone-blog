import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, Request, UploadFile, status

from app.api.schemas import DataResponse, MessageData, Meta, PageMeta, PaginatedResponse
from app.core.request_id import get_request_id
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.media import service
from app.modules.media.schemas import (
    MediaBulkDeleteInput,
    MediaBulkDeleteResult,
    MediaCategory,
    MediaRead,
)

router = APIRouter(prefix="/admin/media", tags=["admin-media"])
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(alias="pageSize", ge=1, le=100)]
Category = Annotated[MediaCategory | None, Query()]
SearchQuery = Annotated[str | None, Query(alias="q", max_length=100)]


@router.get("", response_model=PaginatedResponse[MediaRead])
async def list_media(
    request: Request,
    db: DbSession,
    _: CurrentUser,
    page: Page = 1,
    page_size: PageSize = 40,
    category: Category = None,
    query: SearchQuery = None,
    unused: bool = False,
) -> PaginatedResponse[MediaRead]:
    items, total, total_pages = await service.list_media(
        db, page=page, page_size=page_size, category=category, query=query, unused=unused
    )
    usage = await service.get_media_usage(db, {item.id for item in items})
    return PaginatedResponse(
        data=[
            MediaRead.model_validate(
                {
                    **item.__dict__,
                    "usage_count": len(usage.get(item.id, [])),
                    "usage_labels": usage.get(item.id, []),
                }
            )
            for item in items
        ],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            request_id=get_request_id(request),
        ),
    )


@router.post("", response_model=DataResponse[MediaRead], status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
    file: Annotated[UploadFile, File()],
    category: Annotated[MediaCategory, Form()] = "general",
) -> DataResponse[MediaRead]:
    media = await service.upload_image(db, owner=current_user, upload=file, category=category)
    return DataResponse(
        data=MediaRead.model_validate(media),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.post("/bulk-delete", response_model=DataResponse[MediaBulkDeleteResult])
async def bulk_delete_media(
    payload: MediaBulkDeleteInput,
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[MediaBulkDeleteResult]:
    deleted_count, blocked_names = await service.bulk_delete_media(db, payload.ids)
    return DataResponse(
        data=MediaBulkDeleteResult(
            deleted_count=deleted_count,
            blocked_count=len(blocked_names),
            blocked_names=blocked_names,
        ),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.delete("/{media_id}", response_model=DataResponse[MessageData])
async def delete_media(
    media_id: uuid.UUID,
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[MessageData]:
    await service.delete_media(db, media_id)
    return DataResponse(
        data=MessageData(message="图片已删除。"),
        meta=Meta(request_id=get_request_id(request)),
    )
