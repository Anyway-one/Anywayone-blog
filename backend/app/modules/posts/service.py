import math
import uuid
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.core.errors import AppError
from app.db.enums import PostStatus, PostVersionChangeType, Visibility
from app.modules.audit.models import AuditLog, OutboxEvent
from app.modules.auth.models import User
from app.modules.media.models import Media
from app.modules.posts.models import Post, PostVersion
from app.modules.posts.renderer import render_markdown
from app.modules.posts.schemas import (
    PostCreate,
    PostUpdate,
    PublicationIssue,
    PublicationValidation,
)
from app.modules.taxonomy.models import Category, Tag

UNSET = object()


async def create_post(
    db: AsyncSession,
    *,
    author: User,
    payload: PostCreate,
    request_id: str,
) -> Post:
    await _ensure_slug_available(db, payload.slug)
    rendered = render_markdown(payload.markdown)
    category = await _resolve_category(db, payload.category_id)
    tags = await _resolve_tags(db, payload.tag_ids)
    cover_media = await _resolve_cover_media(db, payload.cover_media_id)
    post = Post(
        author_id=author.id,
        title=payload.title,
        slug=payload.slug,
        excerpt=payload.excerpt,
        markdown=payload.markdown,
        rendered_html=rendered.html,
        toc=rendered.toc,
        reading_time_minutes=rendered.reading_time_minutes,
        category_id=category.id if category else None,
        cover_media_id=cover_media.id if cover_media else None,
        category=category,
        tags=tags,
        cover_media=cover_media,
        cover_alt=payload.cover_alt,
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
    category_id = changes.pop("category_id", UNSET)
    tag_ids = changes.pop("tag_ids", UNSET)
    cover_media_id = changes.pop("cover_media_id", UNSET)
    if "slug" in changes and changes["slug"] != post.slug:
        await _ensure_slug_available(db, str(changes["slug"]), exclude_id=post.id)
    for field, value in changes.items():
        setattr(post, field, value)
    if category_id is not UNSET:
        category = await _resolve_category(
            db,
            category_id if isinstance(category_id, uuid.UUID) else None,
        )
        post.category = category
        post.category_id = category.id if category else None
    if tag_ids is not UNSET:
        resolved_tag_ids = cast("list[uuid.UUID]", tag_ids) if isinstance(tag_ids, list) else []
        post.tags = await _resolve_tags(db, resolved_tag_ids)
    if cover_media_id is not UNSET:
        cover_media = await _resolve_cover_media(
            db,
            cover_media_id if isinstance(cover_media_id, uuid.UUID) else None,
        )
        post.cover_media = cover_media
        post.cover_media_id = cover_media.id if cover_media else None
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
    if post.cover_media_id is not None and not (post.cover_alt or "").strip():
        issues.append(PublicationIssue(field="coverAlt", message="请填写封面替代文本。"))
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
                .options(*_post_load_options())
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
    category_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
) -> tuple[list[Post], int, int]:
    conditions: list[ColumnElement[bool]] = [
        Post.deleted_at.is_(None),
        Post.status == PostStatus.PUBLISHED,
        Post.visibility == Visibility.PUBLIC,
    ]
    if category_id is not None:
        conditions.append(Post.category_id == category_id)
    count_statement = select(func.count()).select_from(Post)
    posts_statement = select(Post)
    if tag_id is not None:
        count_statement = count_statement.join(Post.tags)
        posts_statement = posts_statement.join(Post.tags)
        conditions.append(Tag.id == tag_id)
    total = await db.scalar(count_statement.where(*conditions)) or 0
    posts = list(
        (
            await db.scalars(
                posts_statement.options(*_post_load_options())
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
        select(Post)
        .options(*_post_load_options())
        .where(
            Post.slug == slug,
            Post.deleted_at.is_(None),
            Post.status == PostStatus.PUBLISHED,
            Post.visibility == Visibility.PUBLIC,
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
    statement = (
        select(Post)
        .options(*_post_load_options())
        .where(Post.id == post_id, Post.deleted_at.is_(None))
    )
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
        "categoryId": str(post.category.id) if post.category else None,
        "tagIds": [str(tag.id) for tag in post.tags],
        "coverMediaId": str(post.cover_media.id) if post.cover_media else None,
        "coverAlt": post.cover_alt,
        "status": post.status.value,
        "visibility": post.visibility.value,
        "seo": {
            "title": post.seo_title,
            "description": post.seo_description,
            "canonicalUrl": post.canonical_url,
            "allowIndexing": post.allow_indexing,
        },
    }


def _post_load_options():
    return (
        selectinload(Post.category),
        selectinload(Post.tags),
        selectinload(Post.cover_media),
    )


async def _resolve_category(db: AsyncSession, category_id: uuid.UUID | None) -> Category | None:
    if category_id is None:
        return None
    category = await db.scalar(
        select(Category).where(Category.id == category_id, Category.deleted_at.is_(None))
    )
    if category is None:
        raise AppError(status_code=422, code="CATEGORY_NOT_FOUND", message="所选分类不存在。")
    return category


async def _resolve_tags(db: AsyncSession, tag_ids: list[uuid.UUID]) -> list[Tag]:
    unique_ids = list(dict.fromkeys(tag_ids))
    if not unique_ids:
        return []
    tags = list(
        (
            await db.scalars(select(Tag).where(Tag.id.in_(unique_ids), Tag.deleted_at.is_(None)))
        ).all()
    )
    if len(tags) != len(unique_ids):
        raise AppError(status_code=422, code="TAG_NOT_FOUND", message="部分标签不存在。")
    tags_by_id = {tag.id: tag for tag in tags}
    return [tags_by_id[tag_id] for tag_id in unique_ids]


async def _resolve_cover_media(db: AsyncSession, media_id: uuid.UUID | None) -> Media | None:
    if media_id is None:
        return None
    media = await db.scalar(select(Media).where(Media.id == media_id, Media.deleted_at.is_(None)))
    if media is None:
        raise AppError(status_code=422, code="MEDIA_NOT_FOUND", message="所选封面不存在。")
    return media
