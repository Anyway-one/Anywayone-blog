import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal, overload
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
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


async def record_visitor_event(
    db: AsyncSession, payload: VisitorEventInput, request: object
) -> None:
    headers = getattr(request, "headers", {})
    # Prefer the edge-provided country while allowing a client-provided value in local setups.
    country = headers.get("cf-ipcountry") or headers.get("x-vercel-ip-country") or payload.country
    region = headers.get("x-vercel-ip-country-region") or payload.region
    city = headers.get("x-vercel-ip-city") or payload.city
    event = VisitorEvent(
        occurred_at=datetime.now(UTC),
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
    since = datetime.now(UTC) - timedelta(days=range_days - 1)
    base = select(VisitorEvent).where(VisitorEvent.occurred_at >= since)
    events = list((await db.scalars(base)).all())
    page_views = len(events)
    visitors = len({event.session_id for event in events})
    today = datetime.now(UTC).date()
    today_events = [event for event in events if event.occurred_at.date() == today]
    trend: list[VisitorTrendPoint] = []
    for offset in range(range_days - 1, -1, -1):
        day = today - timedelta(days=offset)
        day_events = [event for event in events if event.occurred_at.date() == day]
        trend.append(
            VisitorTrendPoint(
                date=day,
                page_views=len(day_events),
                visitors=len({event.session_id for event in day_events}),
            )
        )
    common = VisitorStatsRead(
        range_days=range_days,
        page_views=page_views,
        visitors=visitors,
        today_page_views=len(today_events),
        today_visitors=len({event.session_id for event in today_events}),
        trend=trend,
    )
    if not detailed:
        return common

    def counts(key: str) -> list[tuple[str | None, int]]:
        values: dict[str | None, int] = {}
        for event in events:
            value = getattr(event, key)
            values[value] = values.get(value, 0) + 1
        return sorted(values.items(), key=lambda item: item[1], reverse=True)[:8]

    location_values: dict[str | None, int] = {}
    for event in events:
        parts = [part for part in (event.country, event.region, event.city) if part]
        location = " / ".join(parts) or None
        location_values[location] = location_values.get(location, 0) + 1
    locations = sorted(location_values.items(), key=lambda item: item[1], reverse=True)[:8]
    return VisitorAdminStatsRead(
        **common.model_dump(),
        locations=_breakdown(locations, page_views),
        countries=_breakdown(counts("country"), page_views),
        referrers=_breakdown(counts("referrer"), page_views),
        devices=_breakdown(counts("device_type"), page_views),
        pages=_breakdown(counts("path"), page_views),
    )


async def get_profile(db: AsyncSession) -> SiteProfile | None:
    return await db.scalar(select(SiteProfile).where(SiteProfile.singleton_key == "primary"))


def profile_read(
    profile: SiteProfile | None,
    avatar_public_url: str | None = None,
) -> SiteProfileRead:
    if profile is None:
        return SiteProfileRead()
    return SiteProfileRead.model_validate(
        {**profile.__dict__, "avatar_public_url": avatar_public_url}
    )


async def get_profile_read(db: AsyncSession) -> SiteProfileRead:
    row = (
        await db.execute(
            select(SiteProfile, Media).outerjoin(
                Media,
                (Media.id == SiteProfile.avatar_media_id) & Media.deleted_at.is_(None),
            )
        )
    ).first()
    if row is None:
        return profile_read(None)
    profile, avatar = row
    return profile_read(profile, avatar.public_url if avatar else None)


async def update_profile(
    db: AsyncSession,
    *,
    payload: SiteProfileUpdate,
    actor: User,
    request_id: str,
) -> SiteProfile:
    await _validate_media_ids(db, [payload.avatar_media_id])
    profile = await get_profile(db)
    if profile is None:
        profile = SiteProfile(singleton_key="primary")
        db.add(profile)
    changes = payload.model_dump()
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
    settings = await get_site_settings(db)
    if settings is None:
        return SiteSettingsRead()
    return SiteSettingsRead.model_validate(settings)


async def update_site_settings(
    db: AsyncSession,
    *,
    payload: SiteSettingsUpdate,
    actor: User,
    request_id: str,
) -> SiteSettings:
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
