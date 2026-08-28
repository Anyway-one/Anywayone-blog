import math
import uuid
from datetime import UTC, datetime
from typing import cast

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.db.enums import PhotographyStatus
from app.modules.auth.models import User
from app.modules.media.models import Media
from app.modules.photography.models import PhotoCollection, PhotoItem
from app.modules.photography.schemas import (
    PhotoCollectionCreate,
    PhotoCollectionUpdate,
    PhotoItemInput,
    PublicationIssue,
    PublicationValidation,
)


def _options():
    return (
        selectinload(PhotoCollection.cover_media),
        selectinload(PhotoCollection.items).joinedload(PhotoItem.media),
    )


async def list_admin_collections(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
    status: PhotographyStatus | None,
    query: str | None,
) -> tuple[list[PhotoCollection], int, int]:
    conditions: list[ColumnElement[bool]] = [PhotoCollection.deleted_at.is_(None)]
    if status is not None:
        conditions.append(PhotoCollection.status == status)
    if query and query.strip():
        conditions.append(PhotoCollection.title.ilike(f"%{query.strip()}%"))
    total = (
        await db.scalar(select(func.count()).select_from(PhotoCollection).where(*conditions)) or 0
    )
    collections = list(
        (
            await db.scalars(
                select(PhotoCollection)
                .options(*_options())
                .where(*conditions)
                .order_by(PhotoCollection.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .unique()
        .all()
    )
    return collections, total, math.ceil(total / page_size) if total else 0


async def _get_collection(
    db: AsyncSession, collection_id: uuid.UUID, *, for_update: bool = False
) -> PhotoCollection:
    statement = (
        select(PhotoCollection)
        .options(*_options())
        .where(PhotoCollection.id == collection_id, PhotoCollection.deleted_at.is_(None))
    )
    if for_update:
        statement = statement.with_for_update()
    collection = await db.scalar(statement)
    if collection is None:
        raise AppError(status_code=404, code="PHOTOGRAPHY_NOT_FOUND", message="摄影集不存在。")
    return collection


async def get_admin_collection(db: AsyncSession, collection_id: uuid.UUID) -> PhotoCollection:
    return await _get_collection(db, collection_id)


async def _ensure_slug_available(
    db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None
) -> None:
    statement = select(PhotoCollection.id).where(
        PhotoCollection.slug == slug, PhotoCollection.deleted_at.is_(None)
    )
    if exclude_id is not None:
        statement = statement.where(PhotoCollection.id != exclude_id)
    if await db.scalar(statement) is not None:
        raise AppError(
            status_code=409, code="SLUG_CONFLICT", message="页面路径已被使用，请换一个。"
        )


async def _resolve_media(db: AsyncSession, media_ids: set[uuid.UUID]) -> dict[uuid.UUID, Media]:
    if not media_ids:
        return {}
    rows = list(
        (
            await db.scalars(
                select(Media).where(Media.id.in_(media_ids), Media.deleted_at.is_(None))
            )
        ).all()
    )
    resolved = {item.id: item for item in rows}
    if len(resolved) != len(media_ids):
        raise AppError(
            status_code=422, code="INVALID_MEDIA", message="摄影集包含不存在或已删除的图片。"
        )
    return resolved


def _validate_items(items: list[PhotoItemInput]) -> None:
    positions = [item.position for item in items]
    if len(positions) != len(set(positions)):
        raise AppError(
            status_code=422, code="DUPLICATE_PHOTO_POSITION", message="照片顺序不能重复。"
        )


async def create_collection(
    db: AsyncSession, *, owner: User, payload: PhotoCollectionCreate
) -> PhotoCollection:
    await _ensure_slug_available(db, payload.slug)
    _validate_items(payload.items)
    await _resolve_media(
        db,
        {item.media_id for item in payload.items}
        | ({payload.cover_media_id} if payload.cover_media_id else set()),
    )
    if payload.cover_media_id is not None and payload.cover_media_id not in {
        item.media_id for item in payload.items
    }:
        raise AppError(
            status_code=422, code="INVALID_COVER", message="封面必须是当前摄影集中的图片。"
        )
    collection = PhotoCollection(
        author_id=owner.id,
        title=payload.title.strip(),
        slug=payload.slug,
        description=payload.description,
        cover_media_id=payload.cover_media_id,
        captured_from=payload.captured_from,
        captured_to=payload.captured_to,
        location_text=payload.location_text,
    )
    collection.items = [PhotoItem(**item.model_dump()) for item in payload.items]
    db.add(collection)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            status_code=409, code="PHOTOGRAPHY_CONFLICT", message="摄影集保存冲突，请重试。"
        ) from exc
    return await _get_collection(db, collection.id)


def _check_revision(collection: PhotoCollection, revision: int) -> None:
    if collection.revision != revision:
        raise AppError(
            status_code=409,
            code="CONTENT_VERSION_CONFLICT",
            message="摄影集已在其他窗口更新，请刷新后重试。",
            details={"currentRevision": collection.revision},
        )


async def update_collection(
    db: AsyncSession, *, collection_id: uuid.UUID, payload: PhotoCollectionUpdate
) -> PhotoCollection:
    collection = await _get_collection(db, collection_id, for_update=True)
    _check_revision(collection, payload.revision)
    values = payload.model_dump(exclude_unset=True)
    values.pop("revision", None)
    items = values.pop("items", None)
    if "slug" in values and values["slug"] != collection.slug:
        await _ensure_slug_available(db, cast(str, values["slug"]), exclude_id=collection.id)
    cover_media_id = values.get("cover_media_id", collection.cover_media_id)
    if items is not None:
        parsed_items = [PhotoItemInput.model_validate(item) for item in items]
        _validate_items(parsed_items)
        media_ids = {item.media_id for item in parsed_items}
        await _resolve_media(db, media_ids | ({cover_media_id} if cover_media_id else set()))
        if cover_media_id is not None and cover_media_id not in media_ids:
            raise AppError(
                status_code=422, code="INVALID_COVER", message="封面必须是当前摄影集中的图片。"
            )
        collection.items = [PhotoItem(**item.model_dump()) for item in parsed_items]
    elif "cover_media_id" in values:
        await _resolve_media(db, {cover_media_id} if cover_media_id else set())
        if cover_media_id is not None and cover_media_id not in {
            item.media_id for item in collection.items
        }:
            raise AppError(
                status_code=422, code="INVALID_COVER", message="封面必须是当前摄影集中的图片。"
            )
    for field, value in values.items():
        setattr(collection, field, value)
    collection.revision += 1
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            status_code=409, code="PHOTOGRAPHY_CONFLICT", message="摄影集保存冲突，请重试。"
        ) from exc
    return await _get_collection(db, collection.id)


def validate_publication(collection: PhotoCollection) -> PublicationValidation:
    issues: list[PublicationIssue] = []
    if not collection.title.strip():
        issues.append(PublicationIssue(field="title", message="请填写摄影集标题。"))
    if not collection.slug.strip():
        issues.append(PublicationIssue(field="slug", message="请填写页面路径。"))
    if not collection.items:
        issues.append(PublicationIssue(field="items", message="至少添加一张照片。"))
    if collection.cover_media_id is None or collection.cover_media_id not in {
        item.media_id for item in collection.items
    }:
        issues.append(PublicationIssue(field="coverMediaId", message="请选择当前摄影集中的封面。"))
    for index, item in enumerate(collection.items):
        if not (item.alt_text or "").strip():
            issues.append(
                PublicationIssue(
                    field=f"items.{index}.altText", message="请为每张照片填写替代文本。"
                )
            )
    return PublicationValidation(valid=not issues, issues=issues)


async def publish_collection(
    db: AsyncSession, *, collection_id: uuid.UUID, revision: int
) -> PhotoCollection:
    collection = await _get_collection(db, collection_id, for_update=True)
    _check_revision(collection, revision)
    validation = validate_publication(collection)
    if not validation.valid:
        raise AppError(
            status_code=422,
            code="PUBLICATION_INVALID",
            message="摄影集未满足发布条件。",
            details={"issues": [issue.model_dump(by_alias=True) for issue in validation.issues]},
        )
    collection.status = PhotographyStatus.PUBLISHED
    collection.published_at = collection.published_at or datetime.now(UTC)
    collection.revision += 1
    await db.commit()
    return await _get_collection(db, collection.id)


async def withdraw_collection(
    db: AsyncSession, *, collection_id: uuid.UUID, revision: int
) -> PhotoCollection:
    collection = await _get_collection(db, collection_id, for_update=True)
    _check_revision(collection, revision)
    collection.status = PhotographyStatus.WITHDRAWN
    collection.allow_indexing = False
    collection.revision += 1
    await db.commit()
    return await _get_collection(db, collection.id)


async def delete_collection(db: AsyncSession, collection_id: uuid.UUID) -> None:
    collection = await _get_collection(db, collection_id, for_update=True)
    collection.deleted_at = datetime.now(UTC)
    collection.allow_indexing = False
    await db.commit()


async def list_public_collections(db: AsyncSession) -> list[PhotoCollection]:
    return list(
        (
            await db.scalars(
                select(PhotoCollection)
                .options(*_options())
                .where(
                    PhotoCollection.deleted_at.is_(None),
                    PhotoCollection.status == PhotographyStatus.PUBLISHED,
                )
                .order_by(PhotoCollection.published_at.desc())
            )
        )
        .unique()
        .all()
    )


async def get_public_collection(db: AsyncSession, slug: str) -> PhotoCollection:
    collection = await db.scalar(
        select(PhotoCollection)
        .options(*_options())
        .where(
            PhotoCollection.slug == slug,
            PhotoCollection.deleted_at.is_(None),
            PhotoCollection.status == PhotographyStatus.PUBLISHED,
        )
    )
    if collection is None:
        raise AppError(status_code=404, code="PHOTOGRAPHY_NOT_FOUND", message="摄影集不存在。")
    return collection
