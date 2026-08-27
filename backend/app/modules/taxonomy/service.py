import uuid
from datetime import UTC, datetime
from typing import TypeVar

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.posts.models import Post, post_tags
from app.modules.taxonomy.models import Category, Tag
from app.modules.taxonomy.schemas import (
    CategoryCreate,
    CategoryUpdate,
    TaxonomyCreate,
    TaxonomyUpdate,
)

TaxonomyModel = TypeVar("TaxonomyModel", Category, Tag)


async def list_categories(
    db: AsyncSession,
    *,
    public_only: bool = False,
) -> list[tuple[Category, int]]:
    join_condition = Post.category_id == Category.id
    if public_only:
        join_condition &= _public_post_condition()
    statement = (
        select(Category, func.count(Post.id))
        .outerjoin(Post, join_condition)
        .where(Category.deleted_at.is_(None))
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.name)
    )
    if public_only:
        statement = statement.having(func.count(Post.id) > 0)
    return [(row[0], row[1]) for row in (await db.execute(statement)).all()]


async def list_tags(
    db: AsyncSession,
    *,
    public_only: bool = False,
) -> list[tuple[Tag, int]]:
    join_condition = post_tags.c.tag_id == Tag.id
    post_join = Post.id == post_tags.c.post_id
    if public_only:
        post_join &= _public_post_condition()
    statement = (
        select(Tag, func.count(Post.id))
        .outerjoin(post_tags, join_condition)
        .outerjoin(Post, post_join)
        .where(Tag.deleted_at.is_(None))
        .group_by(Tag.id)
        .order_by(func.count(Post.id).desc(), Tag.name)
    )
    if public_only:
        statement = statement.having(func.count(Post.id) > 0)
    return [(row[0], row[1]) for row in (await db.execute(statement)).all()]


async def create_category(
    db: AsyncSession,
    *,
    payload: CategoryCreate,
    actor: User,
    request_id: str,
) -> Category:
    category = Category(**payload.model_dump())
    return await _create_taxonomy(db, category, actor, request_id, "category")


async def create_tag(
    db: AsyncSession,
    *,
    payload: TaxonomyCreate,
    actor: User,
    request_id: str,
) -> Tag:
    tag = Tag(**payload.model_dump())
    return await _create_taxonomy(db, tag, actor, request_id, "tag")


async def update_category(
    db: AsyncSession,
    category_id: uuid.UUID,
    *,
    payload: CategoryUpdate,
    actor: User,
    request_id: str,
) -> Category:
    category = await _get_category(db, category_id, for_update=True)
    return await _update_taxonomy(db, category, payload, actor, request_id, "category")


async def update_tag(
    db: AsyncSession,
    tag_id: uuid.UUID,
    *,
    payload: TaxonomyUpdate,
    actor: User,
    request_id: str,
) -> Tag:
    tag = await _get_tag(db, tag_id, for_update=True)
    return await _update_taxonomy(db, tag, payload, actor, request_id, "tag")


async def delete_category(
    db: AsyncSession,
    category_id: uuid.UUID,
    *,
    actor: User,
    request_id: str,
) -> int:
    category = await _get_category(db, category_id, for_update=True)
    affected = (
        await db.scalar(
            select(func.count())
            .select_from(Post)
            .where(
                Post.category_id == category.id,
                Post.deleted_at.is_(None),
            )
        )
        or 0
    )
    await db.execute(
        update(Post)
        .where(Post.category_id == category.id, Post.deleted_at.is_(None))
        .values(category_id=None)
    )
    category.deleted_at = datetime.now(UTC)
    _add_audit(db, actor, "category.delete", category.id, request_id, {"affected": affected})
    await db.commit()
    return affected


async def delete_tag(
    db: AsyncSession,
    tag_id: uuid.UUID,
    *,
    actor: User,
    request_id: str,
) -> int:
    tag = await _get_tag(db, tag_id, for_update=True)
    affected = (
        await db.scalar(
            select(func.count()).select_from(post_tags).where(post_tags.c.tag_id == tag.id)
        )
        or 0
    )
    await db.execute(delete(post_tags).where(post_tags.c.tag_id == tag.id))
    tag.deleted_at = datetime.now(UTC)
    _add_audit(db, actor, "tag.delete", tag.id, request_id, {"affected": affected})
    await db.commit()
    return affected


async def merge_tag(
    db: AsyncSession,
    source_id: uuid.UUID,
    target_id: uuid.UUID,
    *,
    actor: User,
    request_id: str,
) -> int:
    if source_id == target_id:
        raise AppError(status_code=422, code="INVALID_TAG_MERGE", message="不能合并到同一标签。")
    source = await _get_tag(db, source_id, for_update=True)
    await _get_tag(db, target_id, for_update=True)
    post_ids = list(
        (await db.scalars(select(post_tags.c.post_id).where(post_tags.c.tag_id == source.id))).all()
    )
    for post_id in post_ids:
        exists = await db.scalar(
            select(post_tags.c.post_id).where(
                post_tags.c.post_id == post_id,
                post_tags.c.tag_id == target_id,
            )
        )
        if exists is None:
            await db.execute(insert(post_tags).values(post_id=post_id, tag_id=target_id))
    await db.execute(delete(post_tags).where(post_tags.c.tag_id == source.id))
    source.deleted_at = datetime.now(UTC)
    _add_audit(
        db,
        actor,
        "tag.merge",
        source.id,
        request_id,
        {"targetTagId": str(target_id), "affected": len(post_ids)},
    )
    await db.commit()
    return len(post_ids)


async def get_public_category_by_slug(db: AsyncSession, slug: str) -> Category:
    category = await db.scalar(
        select(Category).where(Category.slug == slug, Category.deleted_at.is_(None))
    )
    if category is None:
        raise AppError(status_code=404, code="CATEGORY_NOT_FOUND", message="分类不存在。")
    return category


async def get_public_tag_by_slug(db: AsyncSession, slug: str) -> Tag:
    tag = await db.scalar(select(Tag).where(Tag.slug == slug, Tag.deleted_at.is_(None)))
    if tag is None:
        raise AppError(status_code=404, code="TAG_NOT_FOUND", message="标签不存在。")
    return tag


async def _create_taxonomy(
    db: AsyncSession,
    item: TaxonomyModel,
    actor: User,
    request_id: str,
    resource_type: str,
) -> TaxonomyModel:
    db.add(item)
    try:
        await db.flush()
        _add_audit(
            db,
            actor,
            f"{resource_type}.create",
            item.id,
            request_id,
            {"name": item.name, "slug": item.slug},
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _taxonomy_conflict() from exc
    await db.refresh(item)
    return item


async def _update_taxonomy(
    db: AsyncSession,
    item: TaxonomyModel,
    payload: CategoryUpdate | TaxonomyUpdate,
    actor: User,
    request_id: str,
    resource_type: str,
) -> TaxonomyModel:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(item, field, value)
    _add_audit(
        db,
        actor,
        f"{resource_type}.update",
        item.id,
        request_id,
        {"fields": sorted(changes)},
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _taxonomy_conflict() from exc
    await db.refresh(item)
    return item


async def _get_category(
    db: AsyncSession,
    category_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Category:
    statement = select(Category).where(
        Category.id == category_id,
        Category.deleted_at.is_(None),
    )
    if for_update:
        statement = statement.with_for_update()
    category = await db.scalar(statement)
    if category is None:
        raise AppError(status_code=404, code="CATEGORY_NOT_FOUND", message="分类不存在。")
    return category


async def _get_tag(
    db: AsyncSession,
    tag_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Tag:
    statement = select(Tag).where(Tag.id == tag_id, Tag.deleted_at.is_(None))
    if for_update:
        statement = statement.with_for_update()
    tag = await db.scalar(statement)
    if tag is None:
        raise AppError(status_code=404, code="TAG_NOT_FOUND", message="标签不存在。")
    return tag


def _public_post_condition():
    from app.db.enums import PostStatus, Visibility

    return (
        Post.deleted_at.is_(None)
        & (Post.status == PostStatus.PUBLISHED)
        & (Post.visibility == Visibility.PUBLIC)
    )


def _add_audit(
    db: AsyncSession,
    actor: User,
    action: str,
    resource_id: uuid.UUID,
    request_id: str,
    summary: dict[str, object],
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            resource_type="taxonomy",
            resource_id=resource_id,
            request_id=request_id,
            summary=summary,
        )
    )


def _taxonomy_conflict() -> AppError:
    return AppError(
        status_code=409,
        code="TAXONOMY_CONFLICT",
        message="名称或页面路径已被使用。",
    )
