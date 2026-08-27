import math
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.core.errors import AppError
from app.db.enums import PostStatus, PostVersionChangeType, Visibility
from app.modules.audit.models import AuditLog, OutboxEvent
from app.modules.auth.models import User
from app.modules.posts.models import Post, PostVersion
from app.modules.posts.renderer import render_markdown
from app.modules.posts.schemas import (
    PostCreate,
    PostUpdate,
    PublicationIssue,
    PublicationValidation,
)


async def create_post(
    db: AsyncSession,
    *,
    author: User,
    payload: PostCreate,
    request_id: str,
) -> Post:
    await _ensure_slug_available(db, payload.slug)
    rendered = render_markdown(payload.markdown)
    post = Post(
        author_id=author.id,
        title=payload.title,
        slug=payload.slug,
        excerpt=payload.excerpt,
        markdown=payload.markdown,
        rendered_html=rendered.html,
        toc=rendered.toc,
        reading_time_minutes=rendered.reading_time_minutes,
    )
    db.add(post)
    try:
        await db.flush()
        db.add(
            PostVersion(
                post_id=post.id,
                version_no=1,
                snapshot=_snapshot(post),
                change_type=PostVersionChangeType.MANUAL_SAVE,
                created_by=author.id,
            )
        )
        db.add(
            AuditLog(
                actor_id=author.id,
                action="post.create",
                resource_type="post",
                resource_id=post.id,
                request_id=request_id,
                summary={"title": post.title, "slug": post.slug},
            )
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _slug_conflict() from exc
    await db.refresh(post)
    return post


async def update_post(
    db: AsyncSession,
    *,
    post_id: uuid.UUID,
    payload: PostUpdate,
    actor: User,
    request_id: str,
) -> Post:
    post = await _get_admin_post(db, post_id, for_update=True)
    _check_revision(post, payload.revision)
    changes = payload.model_dump(exclude_unset=True)
    changes.pop("revision", None)
    seo = changes.pop("seo", None)
    if "slug" in changes and changes["slug"] != post.slug:
        await _ensure_slug_available(db, str(changes["slug"]), exclude_id=post.id)
    for field, value in changes.items():
        setattr(post, field, value)
    if seo is not None:
        post.seo_title = seo.get("title")
        post.seo_description = seo.get("description")
        canonical_url = seo.get("canonical_url")
        post.canonical_url = str(canonical_url) if canonical_url else None
        post.allow_indexing = seo.get("allow_indexing", True)
    rendered = render_markdown(post.markdown)
    post.rendered_html = rendered.html
    post.toc = rendered.toc
    post.reading_time_minutes = rendered.reading_time_minutes
    post.revision += 1
    db.add(
        PostVersion(
            post_id=post.id,
            version_no=post.revision,
            snapshot=_snapshot(post),
            change_type=PostVersionChangeType.MANUAL_SAVE,
            created_by=actor.id,
        )
    )
    db.add(
        AuditLog(
            actor_id=actor.id,
            action="post.update",
            resource_type="post",
            resource_id=post.id,
            request_id=request_id,
            summary={"revision": post.revision, "fields": sorted(changes)},
        )
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _slug_conflict() from exc
    await db.refresh(post)
    return post


async def publish_post(
    db: AsyncSession,
    *,
    post_id: uuid.UUID,
    revision: int,
    actor: User,
    request_id: str,
) -> Post:
    post = await _get_admin_post(db, post_id, for_update=True)
    _check_revision(post, revision)
    validation = validate_publication(post)
    if not validation.valid:
        raise AppError(
            status_code=422,
            code="PUBLICATION_VALIDATION_FAILED",
            message="文章尚未满足发布条件。",
            details={"issues": [issue.model_dump() for issue in validation.issues]},
        )
    now = datetime.now(UTC)
    post.status = PostStatus.PUBLISHED
    post.published_at = post.published_at or now
    post.scheduled_at = None
    post.revision += 1
    db.add(
        PostVersion(
            post_id=post.id,
            version_no=post.revision,
            snapshot=_snapshot(post),
            change_type=PostVersionChangeType.PUBLISH,
            created_by=actor.id,
        )
    )
    db.add(
        AuditLog(
            actor_id=actor.id,
            action="post.publish",
            resource_type="post",
            resource_id=post.id,
            request_id=request_id,
            summary={"revision": post.revision, "slug": post.slug},
        )
    )
    db.add(
        OutboxEvent(
            event_type="PostPublished",
            aggregate_type="post",
            aggregate_id=post.id,
            payload={"postId": str(post.id), "slug": post.slug},
        )
    )
    await db.commit()
    await db.refresh(post)
    return post


async def withdraw_post(
    db: AsyncSession,
    *,
    post_id: uuid.UUID,
    revision: int,
    actor: User,
    request_id: str,
) -> Post:
    post = await _get_admin_post(db, post_id, for_update=True)
    _check_revision(post, revision)
    if post.status is not PostStatus.PUBLISHED:
        raise AppError(
            status_code=409,
            code="INVALID_POST_STATE",
            message="只有已发布文章可以撤回。",
        )
    post.status = PostStatus.WITHDRAWN
    post.allow_indexing = False
    post.revision += 1
    db.add(
        AuditLog(
            actor_id=actor.id,
            action="post.withdraw",
            resource_type="post",
            resource_id=post.id,
            request_id=request_id,
            summary={"revision": post.revision},
        )
    )
    db.add(
        OutboxEvent(
            event_type="PostWithdrawn",
            aggregate_type="post",
            aggregate_id=post.id,
            payload={"postId": str(post.id), "slug": post.slug},
        )
    )
    await db.commit()
    await db.refresh(post)
    return post


def validate_publication(post: Post) -> PublicationValidation:
    issues: list[PublicationIssue] = []
    if not post.title.strip():
        issues.append(PublicationIssue(field="title", message="请填写文章标题。"))
    if not post.slug.strip():
        issues.append(PublicationIssue(field="slug", message="请填写页面路径。"))
    if not post.markdown.strip():
        issues.append(PublicationIssue(field="markdown", message="文章正文不能为空。"))
    return PublicationValidation(valid=not issues, issues=issues)


async def list_admin_posts(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
    status: PostStatus | None,
    query: str | None,
) -> tuple[list[Post], int, int]:
    conditions: list[ColumnElement[bool]] = [Post.deleted_at.is_(None)]
    if status is not None:
        conditions.append(Post.status == status)
    if query:
        conditions.append(Post.title.ilike(f"%{query.strip()}%"))
    total = await db.scalar(select(func.count()).select_from(Post).where(*conditions)) or 0
    posts = list(
        (
            await db.scalars(
                select(Post)
                .where(*conditions)
                .order_by(Post.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    return posts, total, math.ceil(total / page_size) if total else 0


async def get_admin_post(db: AsyncSession, post_id: uuid.UUID) -> Post:
    return await _get_admin_post(db, post_id)


async def list_public_posts(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
) -> tuple[list[Post], int, int]:
    conditions: list[ColumnElement[bool]] = [
        Post.deleted_at.is_(None),
        Post.status == PostStatus.PUBLISHED,
        Post.visibility == Visibility.PUBLIC,
    ]
    total = await db.scalar(select(func.count()).select_from(Post).where(*conditions)) or 0
    posts = list(
        (
            await db.scalars(
                select(Post)
                .where(*conditions)
                .order_by(Post.is_pinned.desc(), Post.published_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    return posts, total, math.ceil(total / page_size) if total else 0


async def get_public_post(db: AsyncSession, slug: str) -> Post:
    post = await db.scalar(
        select(Post).where(
            Post.slug == slug,
            Post.deleted_at.is_(None),
            Post.status == PostStatus.PUBLISHED,
        )
    )
    if post is None:
        raise AppError(status_code=404, code="POST_NOT_FOUND", message="文章不存在。")
    return post


async def _get_admin_post(
    db: AsyncSession,
    post_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Post:
    statement = select(Post).where(Post.id == post_id, Post.deleted_at.is_(None))
    if for_update:
        statement = statement.with_for_update()
    post = await db.scalar(statement)
    if post is None:
        raise AppError(status_code=404, code="POST_NOT_FOUND", message="文章不存在。")
    return post


async def _ensure_slug_available(
    db: AsyncSession,
    slug: str,
    *,
    exclude_id: uuid.UUID | None = None,
) -> None:
    statement = select(Post.id).where(Post.slug == slug, Post.deleted_at.is_(None))
    if exclude_id is not None:
        statement = statement.where(Post.id != exclude_id)
    if await db.scalar(statement) is not None:
        raise _slug_conflict()


def _check_revision(post: Post, revision: int) -> None:
    if post.revision != revision:
        raise AppError(
            status_code=409,
            code="CONTENT_VERSION_CONFLICT",
            message="文章已在其他位置更新，请比较后重试。",
            details={"currentRevision": post.revision},
        )


def _slug_conflict() -> AppError:
    return AppError(
        status_code=409,
        code="SLUG_CONFLICT",
        message="该页面路径已被使用，请更换后重试。",
    )


def _snapshot(post: Post) -> dict[str, Any]:
    return {
        "title": post.title,
        "slug": post.slug,
        "excerpt": post.excerpt,
        "markdown": post.markdown,
        "status": post.status.value,
        "visibility": post.visibility.value,
        "seo": {
            "title": post.seo_title,
            "description": post.seo_description,
            "canonicalUrl": post.canonical_url,
            "allowIndexing": post.allow_indexing,
        },
    }
