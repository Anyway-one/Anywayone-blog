import asyncio
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
from app.modules.auth.models import User
from app.modules.media.models import Media
from app.modules.posts.models import Post

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
) -> tuple[list[Media], int, int]:
    condition = Media.deleted_at.is_(None)
    total = await db.scalar(select(func.count()).select_from(Media).where(condition)) or 0
    items = list(
        (
            await db.scalars(
                select(Media)
                .where(condition)
                .order_by(Media.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    pages = (total + page_size - 1) // page_size if total else 0
    return items, total, pages


async def upload_image(db: AsyncSession, *, owner: User, upload: UploadFile) -> Media:
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
    destination = settings.media_storage_path / object_key
    await asyncio.to_thread(destination.parent.mkdir, 0o755, True, True)
    await asyncio.to_thread(destination.write_bytes, data)

    original_name = Path(upload.filename or "image").name[:255]
    media = Media(
        owner_id=owner.id,
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
        await asyncio.to_thread(destination.unlink, missing_ok=True)
        raise
    await db.refresh(media)
    return media


async def delete_media(db: AsyncSession, media_id: uuid.UUID) -> None:
    media = await db.scalar(
        select(Media).where(Media.id == media_id, Media.deleted_at.is_(None)).with_for_update()
    )
    if media is None:
        raise AppError(status_code=404, code="MEDIA_NOT_FOUND", message="图片不存在。")
    references = await db.scalar(
        select(func.count())
        .select_from(Post)
        .where(
            Post.cover_media_id == media.id,
            Post.deleted_at.is_(None),
        )
    )
    if references:
        raise AppError(
            status_code=409,
            code="MEDIA_IN_USE",
            message="图片仍被文章封面使用，不能删除。",
        )
    media.deleted_at = datetime.now(UTC)
    await db.commit()
    media_path = get_settings().media_storage_path / media.object_key
    try:
        await asyncio.to_thread(media_path.unlink, missing_ok=True)
    except OSError:
        logger.warning("Unable to remove media file", extra={"object_key": media.object_key})
