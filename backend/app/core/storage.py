from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from app.core.config import Settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


class StorageError(RuntimeError):
    """Raised when an object cannot be written to or removed from storage."""


def _r2_client(settings: Settings) -> S3Client:
    from boto3.session import Session

    if settings.r2_account_id is None or settings.r2_access_key_id is None:
        raise StorageError("R2 storage credentials are not configured")
    if settings.r2_secret_access_key is None or settings.r2_bucket_name is None:
        raise StorageError("R2 storage credentials are not configured")
    return Session().client(  # pyright: ignore[reportUnknownMemberType]
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key.get_secret_value(),
        region_name="auto",
    )


async def put_object(settings: Settings, object_key: str, data: bytes, content_type: str) -> None:
    if settings.media_storage_backend == "local":
        destination = settings.media_storage_path / object_key
        await asyncio.to_thread(destination.parent.mkdir, 0o755, True, True)
        await asyncio.to_thread(destination.write_bytes, data)
        return
    try:
        client = _r2_client(settings)
        if settings.r2_bucket_name is None:
            raise StorageError("R2 bucket is not configured")
        await asyncio.to_thread(
            client.put_object,
            Bucket=settings.r2_bucket_name,
            Key=object_key,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
    except Exception as exc:
        raise StorageError("Unable to upload object to R2") from exc


async def delete_object(settings: Settings, object_key: str) -> None:
    if settings.media_storage_backend == "local":
        destination = settings.media_storage_path / object_key
        try:
            await asyncio.to_thread(destination.unlink, missing_ok=True)
        except OSError as exc:
            raise StorageError("Unable to remove local media file") from exc
        return
    try:
        client = _r2_client(settings)
        if settings.r2_bucket_name is None:
            raise StorageError("R2 bucket is not configured")
        await asyncio.to_thread(
            client.delete_object,
            Bucket=settings.r2_bucket_name,
            Key=object_key,
        )
    except Exception as exc:
        raise StorageError("Unable to remove object from R2") from exc
