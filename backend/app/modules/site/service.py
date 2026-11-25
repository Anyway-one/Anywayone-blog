import asyncio
import re
import uuid
from datetime import UTC, datetime, time, timedelta
from time import monotonic
from typing import Literal, cast, overload
from urllib.parse import urlsplit, urlunsplit

from fastapi import Request
from sqlalchemy import ColumnElement, delete, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.sql import Select

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.request_client import get_trusted_location
from app.db.enums import ContactType
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.media.models import Media
from app.modules.site.models import (
    ContactMethod,
    SiteHistoryEvent,
    SiteProfile,
    SiteSettings,
    SocialLink,
    VisitorEvent,
)
from app.modules.site.schemas import (
    ContactMethodInput,
    ContactMethodRead,
    SiteHistoryInput,
    SiteHistoryRead,
    SiteProfileRead,
    SiteProfileUpdate,
    SiteSettingsRead,
    SiteSettingsUpdate,
    SocialLinkRead,
    SocialSettingsUpdate,
    VisitorAdminStatsRead,
    VisitorBreakdownItem,
    VisitorEventInput,
    VisitorStatsRead,
    VisitorTrendPoint,
)

AnalyticsResult = VisitorStatsRead | VisitorAdminStatsRead


class _AnalyticsCache:
    def __init__(self) -> None:
        self._items: dict[tuple[int, bool], tuple[float, AnalyticsResult]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: tuple[int, bool]) -> AnalyticsResult | None:
        async with self._lock:
            item = self._items.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= monotonic():
                self._items.pop(key, None)
                return None
            return value

    async def set(self, key: tuple[int, bool], value: AnalyticsResult) -> None:
        async with self._lock:
            self._items[key] = (
                monotonic() + get_settings().analytics_cache_ttl_seconds,
                value,
            )

    async def clear(self) -> None:
        async with self._lock:
            self._items.clear()


_analytics_cache = _AnalyticsCache()


async def record_visitor_event(
    db: AsyncSession, payload: VisitorEventInput, request: Request
) -> bool:
    now = datetime.now(UTC)
    dedup_seconds = get_settings().analytics_visit_dedup_seconds
    if dedup_seconds:
        duplicate_id = await db.scalar(
            select(VisitorEvent.id)
            .where(
                VisitorEvent.session_id == payload.session_id,
                VisitorEvent.path == payload.path,
                VisitorEvent.occurred_at >= now - timedelta(seconds=dedup_seconds),
            )
            .limit(1)
        )
        if duplicate_id is not None:
            return False

    country, region, city = get_trusted_location(request)
    event = VisitorEvent(
        occurred_at=now,
        **{
            **payload.model_dump(),
            "referrer": _sanitize_referrer(payload.referrer),
            "country": country,
            "region": region,
            "city": city,
        },
    )
    db.add(event)
    await db.commit()
    await _analytics_cache.clear()
    return True


def _sanitize_referrer(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlsplit(value)
    if not parsed.scheme or not parsed.netloc:
        return None
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))[:500]


def _breakdown(rows: list[tuple[str | None, int]], total: int) -> list[VisitorBreakdownItem]:
    return [
        VisitorBreakdownItem(
            name=name or "直接访问",
            count=count,
            percentage=round((count / total) * 100, 1) if total else 0,
        )
        for name, count in rows
    ]


@overload
async def get_visitor_stats(
    db: AsyncSession, *, range_days: int = 30, detailed: Literal[False] = False
) -> VisitorStatsRead: ...


@overload
async def get_visitor_stats(
    db: AsyncSession, *, range_days: int = 30, detailed: Literal[True]
) -> VisitorAdminStatsRead: ...


async def get_visitor_stats(
    db: AsyncSession, *, range_days: int = 30, detailed: bool = False
) -> VisitorStatsRead | VisitorAdminStatsRead:
    range_days = max(7, min(range_days, 90))
    cache_key = (range_days, detailed)
    cached = await _analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    today = datetime.now(UTC).date()
    since = datetime.combine(today - timedelta(days=range_days - 1), time.min, tzinfo=UTC)
    today_start = datetime.combine(today, time.min, tzinfo=UTC)
    summary = (
        await db.execute(build_visitor_summary_statement(since=since, today_start=today_start))
    ).one()
    page_views, visitors, today_page_views, today_visitors = (int(value or 0) for value in summary)

    trend_rows = (await db.execute(build_visitor_trend_statement(since=since))).all()
    trend_by_day = {
        row[0].date() if isinstance(row[0], datetime) else row[0]: (int(row[1]), int(row[2]))
        for row in trend_rows
    }
    trend = [
        VisitorTrendPoint(
            date=day,
            page_views=trend_by_day.get(day, (0, 0))[0],
            visitors=trend_by_day.get(day, (0, 0))[1],
        )
        for day in (today - timedelta(days=offset) for offset in range(range_days - 1, -1, -1))
    ]
    common = VisitorStatsRead(
        range_days=range_days,
        page_views=page_views,
        visitors=visitors,
        today_page_views=today_page_views,
        today_visitors=today_visitors,
        trend=trend,
    )
    if not detailed:
        await _analytics_cache.set(cache_key, common)
        return common

    location: ColumnElement[str | None] = func.nullif(
        func.concat_ws(" / ", VisitorEvent.country, VisitorEvent.region, VisitorEvent.city), ""
    )
    locations, countries, referrers, devices, pages = (
        await _get_breakdown_rows(db, location, since),
        await _get_breakdown_rows(db, cast(ColumnElement[str | None], VisitorEvent.country), since),
        await _get_breakdown_rows(
            db, cast(ColumnElement[str | None], VisitorEvent.referrer), since
        ),
        await _get_breakdown_rows(
            db, cast(ColumnElement[str | None], VisitorEvent.device_type), since
        ),
        await _get_breakdown_rows(db, cast(ColumnElement[str | None], VisitorEvent.path), since),
    )
    result = VisitorAdminStatsRead(
        **common.model_dump(),
        locations=_breakdown(locations, page_views),
        countries=_breakdown(countries, page_views),
        referrers=_breakdown(referrers, page_views),
        devices=_breakdown(devices, page_views),
        pages=_breakdown(pages, page_views),
    )
    await _analytics_cache.set(cache_key, result)
    return result


async def _get_breakdown_rows(
    db: AsyncSession,
    column: ColumnElement[str | None],
    since: datetime,
) -> list[tuple[str | None, int]]:
    rows = (await db.execute(build_visitor_breakdown_statement(column=column, since=since))).all()
    return [(cast(str | None, row[0]), int(row[1])) for row in rows]


def build_visitor_summary_statement(
    *, since: datetime, today_start: datetime
) -> Select[tuple[int, int, int, int]]:
    return select(
        func.count(VisitorEvent.id),
        func.count(distinct(VisitorEvent.session_id)),
        func.count(VisitorEvent.id).filter(VisitorEvent.occurred_at >= today_start),
        func.count(distinct(VisitorEvent.session_id)).filter(
            VisitorEvent.occurred_at >= today_start
        ),
    ).where(VisitorEvent.occurred_at >= since)


def build_visitor_trend_statement(*, since: datetime) -> Select[tuple[datetime, int, int]]:
    day_bucket: ColumnElement[datetime] = func.date_trunc(
        "day", func.timezone("UTC", VisitorEvent.occurred_at)
    )
    return (
        select(
            day_bucket.label("day"),
            func.count(VisitorEvent.id),
            func.count(distinct(VisitorEvent.session_id)),
        )
        .where(VisitorEvent.occurred_at >= since)
        .group_by(day_bucket)
        .order_by(day_bucket)
    )


def build_visitor_breakdown_statement(
    *, column: ColumnElement[str | None], since: datetime
) -> Select[tuple[str | None, int]]:
    return (
        select(column.label("name"), func.count(VisitorEvent.id).label("count"))
        .where(VisitorEvent.occurred_at >= since)
        .group_by(column)
        .order_by(func.count(VisitorEvent.id).desc())
        .limit(8)
    )


async def get_profile(db: AsyncSession) -> SiteProfile | None:
    return await db.scalar(select(SiteProfile).where(SiteProfile.singleton_key == "primary"))


def profile_read(
    profile: SiteProfile | None,
    avatar_public_url: str | None = None,
    personality_portrait_public_url: str | None = None,
) -> SiteProfileRead:
    if profile is None:
        return SiteProfileRead()
    return SiteProfileRead.model_validate(
        {
            **profile.__dict__,
            "avatar_public_url": avatar_public_url,
            "personality_portrait_public_url": personality_portrait_public_url,
        }
    )


async def get_profile_read(db: AsyncSession) -> SiteProfileRead:
    avatar_media = aliased(Media)
    personality_portrait = aliased(Media)
    row = (
        await db.execute(
            select(SiteProfile, avatar_media, personality_portrait)
            .outerjoin(
                avatar_media,
                (avatar_media.id == SiteProfile.avatar_media_id)
                & avatar_media.deleted_at.is_(None),
            )
            .outerjoin(
                personality_portrait,
                (personality_portrait.id == SiteProfile.personality_portrait_media_id)
                & personality_portrait.deleted_at.is_(None),
            )
        )
    ).first()
    if row is None:
        return profile_read(None)
    profile, avatar, portrait = row
    return profile_read(
        profile,
        avatar.public_url if avatar else None,
        portrait.public_url if portrait else None,
    )


async def update_profile(
    db: AsyncSession,
    *,
    payload: SiteProfileUpdate,
    actor: User,
    request_id: str,
) -> SiteProfile:
    await _validate_media_ids(db, [payload.avatar_media_id, payload.personality_portrait_media_id])
    profile = await get_profile(db)
    if profile is None:
        profile = SiteProfile(singleton_key="primary")
        db.add(profile)
    changes = payload.model_dump()
    if payload.personality_learn_more_url is not None:
        changes["personality_learn_more_url"] = str(payload.personality_learn_more_url)
    for field, value in changes.items():
        setattr(profile, field, value)
    await db.flush()
    _add_audit(db, actor, "settings.profile.update", profile.id, request_id, sorted(changes))
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_site_settings(db: AsyncSession) -> SiteSettings | None:
    return await db.scalar(select(SiteSettings).where(SiteSettings.singleton_key == "primary"))


async def get_site_settings_read(db: AsyncSession) -> SiteSettingsRead:
    web_logo = aliased(Media)
    mobile_logo = aliased(Media)
    og_image = aliased(Media)
    row = (
        await db.execute(
            select(SiteSettings, web_logo, mobile_logo, og_image)
            .outerjoin(
                web_logo,
                (web_logo.id == SiteSettings.logo_web_media_id) & web_logo.deleted_at.is_(None),
            )
            .outerjoin(
                mobile_logo,
                (mobile_logo.id == SiteSettings.logo_mobile_media_id)
                & mobile_logo.deleted_at.is_(None),
            )
            .outerjoin(
                og_image,
                (og_image.id == SiteSettings.og_image_media_id) & og_image.deleted_at.is_(None),
            )
        )
    ).first()
    if row is None:
        return SiteSettingsRead()
    settings, web_media, mobile_media, og_media = row
    copyright_statement = settings.copyright_statement
    if copyright_statement == "保留所有权利。":
        copyright_statement = "All rights reserved."
    return SiteSettingsRead.model_validate(
        {
            **settings.__dict__,
            "copyright_statement": copyright_statement,
            "logo_web_public_url": web_media.public_url if web_media else None,
            "logo_mobile_public_url": mobile_media.public_url if mobile_media else None,
            "og_image_public_url": og_media.public_url if og_media else None,
        }
    )


async def update_site_settings(
    db: AsyncSession,
    *,
    payload: SiteSettingsUpdate,
    actor: User,
    request_id: str,
) -> SiteSettings:
    await _validate_media_ids(
        db,
        [payload.logo_web_media_id, payload.logo_mobile_media_id, payload.og_image_media_id],
    )
    settings = await get_site_settings(db)
    if settings is None:
        settings = SiteSettings(singleton_key="primary")
        db.add(settings)
    changes = payload.model_dump()
    for field, value in changes.items():
        setattr(settings, field, value)
    await db.flush()
    _add_audit(db, actor, "settings.site.update", settings.id, request_id, sorted(changes))
    await db.commit()
    await db.refresh(settings)
    return settings


async def list_history(db: AsyncSession) -> list[SiteHistoryRead]:
    rows = (
        await db.execute(
            select(SiteHistoryEvent, Media)
            .outerjoin(
                Media,
                (Media.id == SiteHistoryEvent.image_media_id) & Media.deleted_at.is_(None),
            )
            .order_by(SiteHistoryEvent.event_date, SiteHistoryEvent.created_at)
        )
    ).all()
    return [
        SiteHistoryRead.model_validate(
            {
                **event.__dict__,
                "image_public_url": media.public_url if media else None,
                "image_width": media.width if media else None,
                "image_height": media.height if media else None,
            }
        )
        for event, media in rows
    ]


async def create_history_event(
    db: AsyncSession,
    *,
    payload: SiteHistoryInput,
    actor: User,
    request_id: str,
) -> SiteHistoryRead:
    await _validate_media_ids(db, [payload.image_media_id])
    event = SiteHistoryEvent(**payload.model_dump())
    db.add(event)
    await db.flush()
    _add_audit(
        db,
        actor,
        "site_history.create",
        event.id,
        request_id,
        ["event"],
        resource_type="site_history",
    )
    await db.commit()
    return await get_history_event_read(db, event.id)


async def update_history_event(
    db: AsyncSession,
    *,
    event_id: uuid.UUID,
    payload: SiteHistoryInput,
    actor: User,
    request_id: str,
) -> SiteHistoryRead:
    await _validate_media_ids(db, [payload.image_media_id])
    event = await _get_history_event(db, event_id, for_update=True)
    changes = payload.model_dump()
    for field, value in changes.items():
        setattr(event, field, value)
    _add_audit(
        db,
        actor,
        "site_history.update",
        event.id,
        request_id,
        sorted(changes),
        resource_type="site_history",
    )
    await db.commit()
    return await get_history_event_read(db, event.id)


async def delete_history_event(
    db: AsyncSession,
    *,
    event_id: uuid.UUID,
    actor: User,
    request_id: str,
) -> None:
    event = await _get_history_event(db, event_id, for_update=True)
    _add_audit(
        db,
        actor,
        "site_history.delete",
        event.id,
        request_id,
        ["event"],
        resource_type="site_history",
    )
    await db.delete(event)
    await db.commit()


async def get_history_event_read(db: AsyncSession, event_id: uuid.UUID) -> SiteHistoryRead:
    row = (
        await db.execute(
            select(SiteHistoryEvent, Media)
            .outerjoin(
                Media,
                (Media.id == SiteHistoryEvent.image_media_id) & Media.deleted_at.is_(None),
            )
            .where(SiteHistoryEvent.id == event_id)
        )
    ).first()
    if row is None:
        raise AppError(status_code=404, code="SITE_HISTORY_NOT_FOUND", message="站点纪事不存在。")
    event, media = row
    return SiteHistoryRead.model_validate(
        {
            **event.__dict__,
            "image_public_url": media.public_url if media else None,
            "image_width": media.width if media else None,
            "image_height": media.height if media else None,
        }
    )


async def _get_history_event(
    db: AsyncSession, event_id: uuid.UUID, *, for_update: bool = False
) -> SiteHistoryEvent:
    statement = select(SiteHistoryEvent).where(SiteHistoryEvent.id == event_id)
    if for_update:
        statement = statement.with_for_update()
    event = await db.scalar(statement)
    if event is None:
        raise AppError(status_code=404, code="SITE_HISTORY_NOT_FOUND", message="站点纪事不存在。")
    return event


async def list_contacts(
    db: AsyncSession,
    *,
    public_only: bool = False,
) -> list[ContactMethodRead]:
    statement = (
        select(ContactMethod, Media)
        .outerjoin(
            Media,
            (Media.id == ContactMethod.qr_media_id) & Media.deleted_at.is_(None),
        )
        .order_by(ContactMethod.sort_order, ContactMethod.contact_type)
    )
    if public_only:
        statement = statement.where(ContactMethod.is_enabled.is_(True))
    rows = (await db.execute(statement)).all()
    return [
        ContactMethodRead.model_validate(
            {
                **contact.__dict__,
                "qr_public_url": media.public_url if media else None,
                "href": contact_href(contact.contact_type, contact.value),
            }
        )
        for contact, media in rows
    ]


async def replace_contacts(
    db: AsyncSession,
    *,
    items: list[ContactMethodInput],
    actor: User,
    request_id: str,
) -> list[ContactMethodRead]:
    await _validate_media_ids(db, [item.qr_media_id for item in items])
    await db.execute(delete(ContactMethod))
    db.add_all(ContactMethod(**item.model_dump()) for item in items)
    _add_audit(
        db,
        actor,
        "settings.contacts.update",
        None,
        request_id,
        [item.contact_type.value for item in items],
    )
    await db.commit()
    return await list_contacts(db)


async def list_social_links(
    db: AsyncSession,
    *,
    public_only: bool = False,
) -> list[SocialLinkRead]:
    statement = select(SocialLink).order_by(SocialLink.sort_order, SocialLink.platform)
    if public_only:
        statement = statement.where(SocialLink.is_enabled.is_(True))
    items = list((await db.scalars(statement)).all())
    return [SocialLinkRead.model_validate(item) for item in items]


async def replace_social_links(
    db: AsyncSession,
    *,
    payload: SocialSettingsUpdate,
    actor: User,
    request_id: str,
) -> list[SocialLinkRead]:
    await db.execute(delete(SocialLink))
    for item in payload.items:
        values = item.model_dump(mode="json")
        db.add(SocialLink(**values))
    _add_audit(
        db,
        actor,
        "settings.social.update",
        None,
        request_id,
        [item.platform.value for item in payload.items],
    )
    await db.commit()
    return await list_social_links(db)


def contact_href(contact_type: ContactType, value: str) -> str | None:
    if contact_type is ContactType.EMAIL:
        return f"mailto:{value}"
    if contact_type is ContactType.PHONE:
        return f"tel:{re.sub(r'[^+0-9]', '', value)}"
    if contact_type is ContactType.WHATSAPP:
        digits = re.sub(r"\D", "", value)
        return f"https://wa.me/{digits}" if digits else None
    if contact_type is ContactType.TELEGRAM:
        username = value.removeprefix("@").strip()
        return f"https://t.me/{username}" if username else None
    return None


async def _validate_media_ids(
    db: AsyncSession,
    media_ids: list[uuid.UUID | None],
) -> None:
    expected = {media_id for media_id in media_ids if media_id is not None}
    if not expected:
        return
    existing = set(
        (
            await db.scalars(
                select(Media.id).where(Media.id.in_(expected), Media.deleted_at.is_(None))
            )
        ).all()
    )
    if existing != expected:
        raise AppError(status_code=422, code="MEDIA_NOT_FOUND", message="图片不存在。")


def _add_audit(
    db: AsyncSession,
    actor: User,
    action: str,
    resource_id: uuid.UUID | None,
    request_id: str,
    fields: list[str],
    resource_type: str = "site_settings",
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            request_id=request_id,
            summary={"fields": fields},
        )
    )
