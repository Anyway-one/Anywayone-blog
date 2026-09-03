import logging
import uuid
import warnings
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.storage import StorageError, delete_object, put_object
from app.modules.auth.models import User
from app.modules.media.models import Media
from app.modules.media.schemas import MediaCategory
from app.modules.photography.models import PhotoCollection, PhotoItem
from app.modules.posts.models import Post
from app.modules.site.models import ContactMethod, SiteHistoryEvent, SiteProfile, SiteSettings

IMAGE_FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
    "GIF": ("gif", "image/gif"),
    "AVIF": ("avif", "image/avif"),
}
logger = logging.getLogger(__name__)


async def list_media(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
    category: MediaCategory | None = None,
    query: str | None = None,
    unused: bool = False,
) -> tuple[list[Media], int, int]:
    condition = Media.deleted_at.is_(None)
    if category is not None:
        condition = condition & (Media.category == category)
    if query and query.strip():
        condition = condition & Media.original_name.ilike(f"%{query.strip()}%")
    total = await db.scalar(select(func.count()).select_from(Media).where(condition)) or 0
    statement = select(Media).where(condition).order_by(Media.created_at.desc())
    if unused:
        all_items = list((await db.scalars(statement)).all())
        usage = await get_media_usage(db, {item.id for item in all_items})
        all_items = [item for item in all_items if item.id not in usage]
        total = len(all_items)
        items = all_items[(page - 1) * page_size : page * page_size]
    else:
        items = list(
            (await db.scalars(statement.offset((page - 1) * page_size).limit(page_size))).all()
        )
    pages = (total + page_size - 1) // page_size if total else 0
    return items, total, pages


async def get_media_usage(
    db: AsyncSession, media_ids: set[uuid.UUID]
) -> dict[uuid.UUID, list[str]]:
    if not media_ids:
        return {}
    usage: dict[uuid.UUID, list[str]] = {}

    def add(media_id: uuid.UUID, label: str) -> None:
        usage.setdefault(media_id, []).append(label)

    for media_id, title in await db.execute(
        select(Post.cover_media_id, Post.title).where(
            Post.cover_media_id.in_(media_ids), Post.deleted_at.is_(None)
        )
    ):
        add(media_id, f"文章封面：{title}")
    for media_id, collection_title in await db.execute(
        select(PhotoItem.media_id, PhotoCollection.title)
        .join(PhotoCollection, PhotoCollection.id == PhotoItem.collection_id)
        .where(PhotoItem.media_id.in_(media_ids), PhotoCollection.deleted_at.is_(None))
    ):
        add(media_id, f"摄影集：{collection_title or '未命名'}")
    for media_id in (
        await db.scalars(
            select(SiteProfile.avatar_media_id).where(SiteProfile.avatar_media_id.in_(media_ids))
        )
    ).all():
        if media_id is not None:
            add(media_id, "个人资料头像")
    for media_id in (
        await db.scalars(
            select(SiteProfile.personality_portrait_media_id).where(
                SiteProfile.personality_portrait_media_id.in_(media_ids)
            )
        )
    ).all():
        if media_id is not None:
            add(media_id, "人格肖像")
    for media_id in (
        await db.scalars(
            select(SiteSettings.logo_web_media_id).where(
                SiteSettings.logo_web_media_id.in_(media_ids)
            )
        )
    ).all():
        if media_id is not None:
            add(media_id, "网站 Logo")
    for media_id in (
        await db.scalars(
            select(SiteSettings.logo_mobile_media_id).where(
                SiteSettings.logo_mobile_media_id.in_(media_ids)
            )
        )
    ).all():
        if media_id is not None:
            add(media_id, "移动端 Logo")
    for media_id in (
        await db.scalars(
            select(SiteSettings.og_image_media_id).where(
                SiteSettings.og_image_media_id.in_(media_ids)
            )
        )
    ).all():
        if media_id is not None:
            add(media_id, "默认分享图")
    for media_id in (
        await db.scalars(
            select(ContactMethod.qr_media_id).where(ContactMethod.qr_media_id.in_(media_ids))
        )
    ).all():
        if media_id is not None:
            add(media_id, "联系方式二维码")
    for media_id, name in await db.execute(
        select(SiteHistoryEvent.image_media_id, SiteHistoryEvent.name).where(
            SiteHistoryEvent.image_media_id.in_(media_ids)
        )
    ):
        add(media_id, f"站点纪事：{name}")
    for media_id, name in await db.execute(
        select(User.avatar_media_id, User.display_name).where(User.avatar_media_id.in_(media_ids))
    ):
        add(media_id, f"用户头像：{name}")
    return usage


async def upload_image(
    db: AsyncSession, *, owner: User, upload: UploadFile, category: MediaCategory = "general"
) -> Media:
    settings = get_settings()
    data = await upload.read(settings.media_max_upload_bytes + 1)
    if len(data) > settings.media_max_upload_bytes:
        raise AppError(status_code=413, code="FILE_TOO_LARGE", message="图片不能超过 10 MB。")
    if not data:
        raise AppError(status_code=422, code="INVALID_IMAGE", message="请选择有效的图片文件。")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                image.verify()
            with Image.open(BytesIO(data)) as image:
                image_format = image.format
                width, height = image.size
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
    ) as exc:
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message="图片格式无效或文件已损坏。",
        ) from exc

    if image_format not in IMAGE_FORMATS:
        raise AppError(
            status_code=422,
            code="UNSUPPORTED_IMAGE_TYPE",
            message="仅支持 JPEG、PNG、WebP、GIF 和 AVIF 图片。",
        )
    extension, mime_type = IMAGE_FORMATS[image_format]
    date_prefix = datetime.now(UTC).strftime("%Y/%m")
    object_key = f"{date_prefix}/{uuid.uuid4().hex}.{extension}"
    try:
        await put_object(settings, object_key, data, mime_type)
    except StorageError as exc:
        raise AppError(
            status_code=503,
            code="MEDIA_STORAGE_UNAVAILABLE",
            message="图片存储服务暂时不可用，请稍后重试。",
        ) from exc

    original_name = Path(upload.filename or "image").name[:255]
    media = Media(
        owner_id=owner.id,
        category=category,
        object_key=object_key,
        public_url=f"{settings.media_public_url.rstrip('/')}/{object_key}",
        original_name=original_name,
        mime_type=mime_type,
        size_bytes=len(data),
        width=width,
        height=height,
    )
    db.add(media)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        try:
            await delete_object(settings, object_key)
        except StorageError:
            logger.warning("Unable to clean up uploaded media", extra={"object_key": object_key})
        raise
    await db.refresh(media)
    return media


async def bulk_delete_media(db: AsyncSession, media_ids: list[uuid.UUID]) -> tuple[int, list[str]]:
    unique_ids = set(media_ids)
    if not unique_ids:
        return 0, []
    media_items = list(
        (
            await db.scalars(
                select(Media)
                .where(Media.id.in_(unique_ids), Media.deleted_at.is_(None))
                .with_for_update()
            )
        ).all()
    )
    usage = await get_media_usage(db, {item.id for item in media_items})
    blocked_names = [item.original_name for item in media_items if item.id in usage]
    deletable = [item for item in media_items if item.id not in usage]
    now = datetime.now(UTC)
    for item in deletable:
        item.deleted_at = now
    await db.commit()
    for item in deletable:
        try:
            await delete_object(get_settings(), item.object_key)
        except StorageError:
            logger.warning("Unable to remove media file", extra={"object_key": item.object_key})
    return len(deletable), blocked_names


async def delete_media(db: AsyncSession, media_id: uuid.UUID) -> None:
    media = await db.scalar(
        select(Media).where(Media.id == media_id, Media.deleted_at.is_(None)).with_for_update()
    )
    if media is None:
        raise AppError(status_code=404, code="MEDIA_NOT_FOUND", message="图片不存在。")
    post_references = await db.scalar(
        select(func.count())
        .select_from(Post)
        .where(
            Post.cover_media_id == media.id,
            Post.deleted_at.is_(None),
        )
    )
    profile_references = await db.scalar(
        select(func.count())
        .select_from(SiteProfile)
        .where(
            (SiteProfile.avatar_media_id == media.id)
            | (SiteProfile.personality_portrait_media_id == media.id)
        )
    )
    user_references = await db.scalar(
        select(func.count()).select_from(User).where(User.avatar_media_id == media.id)
    )
    site_settings_references = await db.scalar(
        select(func.count())
        .select_from(SiteSettings)
        .where(
            (SiteSettings.logo_web_media_id == media.id)
            | (SiteSettings.logo_mobile_media_id == media.id)
            | (SiteSettings.og_image_media_id == media.id)
        )
    )
    contact_references = await db.scalar(
        select(func.count()).select_from(ContactMethod).where(ContactMethod.qr_media_id == media.id)
    )
    photography_references = await db.scalar(
        select(func.count()).select_from(PhotoItem).where(PhotoItem.media_id == media.id)
    )
    history_references = await db.scalar(
        select(func.count())
        .select_from(SiteHistoryEvent)
        .where(SiteHistoryEvent.image_media_id == media.id)
    )
    if (
        post_references
        or profile_references
        or user_references
        or site_settings_references
        or contact_references
        or photography_references
        or history_references
    ):
        raise AppError(
            status_code=409,
            code="MEDIA_IN_USE",
            message="图片仍被站点内容使用，不能删除。",
        )
    media.deleted_at = datetime.now(UTC)
    await db.commit()
    try:
        await delete_object(get_settings(), media.object_key)
    except StorageError:
        logger.warning("Unable to remove media file", extra={"object_key": media.object_key})
