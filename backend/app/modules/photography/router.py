import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.schemas import DataResponse, MessageData, Meta, PageMeta, PaginatedResponse
from app.core.request_id import get_request_id
from app.db.enums import PhotographyStatus
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.photography import service
from app.modules.photography.models import PhotoCollection, PhotoItem
from app.modules.photography.schemas import (
    PhotoCollectionCreate,
    PhotoCollectionListItem,
    PhotoCollectionRead,
    PhotoCollectionUpdate,
    PhotoItemRead,
    PublicationValidation,
    PublicPhotoCollection,
    PublicPhotoCollectionListItem,
)

admin_router = APIRouter(prefix="/admin/photography", tags=["admin-photography"])
public_router = APIRouter(prefix="/public/photography", tags=["public-photography"])
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(alias="pageSize", ge=1, le=100)]
StatusFilter = Annotated[PhotographyStatus | None, Query(alias="status")]
SearchQuery = Annotated[str | None, Query(alias="q", max_length=100)]


def item_read(item: PhotoItem) -> PhotoItemRead:
    return PhotoItemRead(
        id=item.id,
        media_id=item.media_id,
        position=item.position,
        title=item.title,
        alt_text=item.alt_text,
        caption=item.caption,
        public_url=item.media.public_url,
        width=item.media.width,
        height=item.media.height,
        original_name=item.media.original_name,
    )


def admin_list(collection: PhotoCollection) -> PhotoCollectionListItem:
    cover = collection.cover_media
    return PhotoCollectionListItem(
        id=collection.id,
        title=collection.title,
        slug=collection.slug,
        description=collection.description,
        cover_media_id=collection.cover_media_id,
        cover_public_url=cover.public_url if cover else None,
        cover_width=cover.width if cover else None,
        cover_height=cover.height if cover else None,
        captured_from=collection.captured_from,
        captured_to=collection.captured_to,
        location_text=collection.location_text,
        status=collection.status,
        revision=collection.revision,
        photo_count=len(collection.items),
        published_at=collection.published_at,
        updated_at=collection.updated_at,
    )


def read_collection(collection: PhotoCollection) -> PhotoCollectionRead:
    return PhotoCollectionRead(
        id=collection.id,
        author_id=collection.author_id,
        title=collection.title,
        slug=collection.slug,
        description=collection.description,
        cover_media_id=collection.cover_media_id,
        captured_from=collection.captured_from,
        captured_to=collection.captured_to,
        location_text=collection.location_text,
        status=collection.status,
        allow_indexing=collection.allow_indexing,
        revision=collection.revision,
        published_at=collection.published_at,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        items=[item_read(item) for item in collection.items],
    )


def public_list(collection: PhotoCollection) -> PublicPhotoCollectionListItem:
    assert collection.published_at is not None
    cover = collection.cover_media or collection.items[0].media
    return PublicPhotoCollectionListItem(
        id=collection.id,
        title=collection.title,
        slug=collection.slug,
        description=collection.description,
        cover_public_url=cover.public_url,
        cover_width=cover.width,
        cover_height=cover.height,
        captured_from=collection.captured_from,
        captured_to=collection.captured_to,
        location_text=collection.location_text,
        photo_count=len(collection.items),
        published_at=collection.published_at,
    )


def public_read(collection: PhotoCollection) -> PublicPhotoCollection:
    assert collection.published_at is not None
    return PublicPhotoCollection(
        id=collection.id,
        title=collection.title,
        slug=collection.slug,
        description=collection.description,
        captured_from=collection.captured_from,
        captured_to=collection.captured_to,
        location_text=collection.location_text,
        published_at=collection.published_at,
        items=[item_read(item) for item in collection.items],
    )


@admin_router.get("", response_model=PaginatedResponse[PhotoCollectionListItem])
async def list_collections(
    request: Request,
    db: DbSession,
    _: CurrentUser,
    page: Page = 1,
    page_size: PageSize = 20,
    collection_status: StatusFilter = None,
    query: SearchQuery = None,
):
    items, total, total_pages = await service.list_admin_collections(
        db, page=page, page_size=page_size, status=collection_status, query=query
    )
    return PaginatedResponse(
        data=[admin_list(item) for item in items],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            request_id=get_request_id(request),
        ),
    )


@admin_router.post(
    "", response_model=DataResponse[PhotoCollectionRead], status_code=status.HTTP_201_CREATED
)
async def create_collection(
    payload: PhotoCollectionCreate, request: Request, db: DbSession, current_user: CurrentUser
):
    collection = await service.create_collection(db, owner=current_user, payload=payload)
    return DataResponse(
        data=read_collection(collection), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.get("/{collection_id}", response_model=DataResponse[PhotoCollectionRead])
async def get_collection(collection_id: uuid.UUID, request: Request, db: DbSession, _: CurrentUser):
    return DataResponse(
        data=read_collection(await service.get_admin_collection(db, collection_id)),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/{collection_id}", response_model=DataResponse[PhotoCollectionRead])
async def update_collection(
    collection_id: uuid.UUID,
    payload: PhotoCollectionUpdate,
    request: Request,
    db: DbSession,
    _: CurrentUser,
):
    collection = await service.update_collection(db, collection_id=collection_id, payload=payload)
    return DataResponse(
        data=read_collection(collection), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.post(
    "/{collection_id}/validate-publication", response_model=DataResponse[PublicationValidation]
)
async def validate_collection(
    collection_id: uuid.UUID, request: Request, db: DbSession, _: CurrentUser
):
    return DataResponse(
        data=service.validate_publication(await service.get_admin_collection(db, collection_id)),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post("/{collection_id}/publish", response_model=DataResponse[PhotoCollectionRead])
async def publish_collection(
    collection_id: uuid.UUID,
    payload: dict[str, int],
    request: Request,
    db: DbSession,
    _: CurrentUser,
):
    collection = await service.publish_collection(
        db, collection_id=collection_id, revision=payload.get("revision", 0)
    )
    return DataResponse(
        data=read_collection(collection), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.post("/{collection_id}/withdraw", response_model=DataResponse[PhotoCollectionRead])
async def withdraw_collection(
    collection_id: uuid.UUID,
    payload: dict[str, int],
    request: Request,
    db: DbSession,
    _: CurrentUser,
):
    collection = await service.withdraw_collection(
        db, collection_id=collection_id, revision=payload.get("revision", 0)
    )
    return DataResponse(
        data=read_collection(collection), meta=Meta(request_id=get_request_id(request))
    )


@admin_router.delete("/{collection_id}", response_model=DataResponse[MessageData])
async def delete_collection(
    collection_id: uuid.UUID, request: Request, db: DbSession, _: CurrentUser
):
    await service.delete_collection(db, collection_id)
    return DataResponse(
        data=MessageData(message="摄影集已移入回收站。"),
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get("", response_model=DataResponse[list[PublicPhotoCollectionListItem]])
async def list_public(request: Request, db: DbSession):
    return DataResponse(
        data=[public_list(item) for item in await service.list_public_collections(db)],
        meta=Meta(request_id=get_request_id(request)),
    )


@public_router.get("/{slug}", response_model=DataResponse[PublicPhotoCollection])
async def get_public(slug: str, request: Request, db: DbSession):
    return DataResponse(
        data=public_read(await service.get_public_collection(db, slug)),
        meta=Meta(request_id=get_request_id(request)),
    )
