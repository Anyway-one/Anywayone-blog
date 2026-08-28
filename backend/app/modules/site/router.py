import uuid

from fastapi import APIRouter, Request, Response, status

from app.api.schemas import DataResponse, Meta
from app.core.request_id import get_request_id
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.site import service
from app.modules.site.schemas import (
    ContactMethodRead,
    ContactSettingsUpdate,
    PublicSiteData,
    SiteHistoryInput,
    SiteHistoryRead,
    SiteProfileRead,
    SiteProfileUpdate,
    SiteSettingsRead,
    SiteSettingsUpdate,
    SocialLinkRead,
    SocialSettingsUpdate,
    VisitorAdminStatsRead,
    VisitorEventInput,
    VisitorStatsRead,
)

admin_router = APIRouter(prefix="/admin/settings", tags=["admin-site-settings"])
public_router = APIRouter(prefix="/public/site", tags=["public-site-settings"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


@analytics_router.post("/visit", status_code=status.HTTP_204_NO_CONTENT)
async def record_visit(payload: VisitorEventInput, request: Request, db: DbSession) -> Response:
    await service.record_visitor_event(db, payload, request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@analytics_router.get("/public", response_model=DataResponse[VisitorStatsRead])
async def get_public_analytics(
    request: Request, db: DbSession, days: int = 30
) -> DataResponse[VisitorStatsRead]:
    return DataResponse(
        data=await service.get_visitor_stats(db, range_days=days),
        meta=Meta(request_id=get_request_id(request)),
    )


@analytics_router.get("/admin", response_model=DataResponse[VisitorAdminStatsRead])
async def get_admin_analytics(
    request: Request, db: DbSession, _: CurrentUser, days: int = 30
) -> DataResponse[VisitorAdminStatsRead]:
    return DataResponse(
        data=await service.get_visitor_stats(db, range_days=days, detailed=True),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("/profile", response_model=DataResponse[SiteProfileRead])
async def get_admin_profile(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[SiteProfileRead]:
    return DataResponse(
        data=await service.get_profile_read(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/profile", response_model=DataResponse[SiteProfileRead])
async def update_admin_profile(
    payload: SiteProfileUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[SiteProfileRead]:
    await service.update_profile(
        db,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=await service.get_profile_read(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("/site", response_model=DataResponse[SiteSettingsRead])
async def get_admin_site_settings(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[SiteSettingsRead]:
    return DataResponse(
        data=await service.get_site_settings_read(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/site", response_model=DataResponse[SiteSettingsRead])
async def update_admin_site_settings(
    payload: SiteSettingsUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[SiteSettingsRead]:
    await service.update_site_settings(
        db,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(
        data=await service.get_site_settings_read(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.get("/history", response_model=DataResponse[list[SiteHistoryRead]])
async def get_admin_history(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[list[SiteHistoryRead]]:
    return DataResponse(
        data=await service.list_history(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.post(
    "/history", response_model=DataResponse[SiteHistoryRead], status_code=status.HTTP_201_CREATED
)
async def create_admin_history_event(
    payload: SiteHistoryInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[SiteHistoryRead]:
    item = await service.create_history_event(
        db, payload=payload, actor=current_user, request_id=get_request_id(request)
    )
    return DataResponse(data=item, meta=Meta(request_id=get_request_id(request)))


@admin_router.put("/history/{event_id}", response_model=DataResponse[SiteHistoryRead])
async def update_admin_history_event(
    event_id: uuid.UUID,
    payload: SiteHistoryInput,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[SiteHistoryRead]:
    item = await service.update_history_event(
        db,
        event_id=event_id,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(data=item, meta=Meta(request_id=get_request_id(request)))


@admin_router.delete("/history/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_history_event(
    event_id: uuid.UUID,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    await service.delete_history_event(
        db,
        event_id=event_id,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get("/contacts", response_model=DataResponse[list[ContactMethodRead]])
async def get_admin_contacts(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[list[ContactMethodRead]]:
    return DataResponse(
        data=await service.list_contacts(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/contacts", response_model=DataResponse[list[ContactMethodRead]])
async def update_admin_contacts(
    payload: ContactSettingsUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[list[ContactMethodRead]]:
    items = await service.replace_contacts(
        db,
        items=payload.items,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(data=items, meta=Meta(request_id=get_request_id(request)))


@admin_router.get("/social-links", response_model=DataResponse[list[SocialLinkRead]])
async def get_admin_social_links(
    request: Request,
    db: DbSession,
    _: CurrentUser,
) -> DataResponse[list[SocialLinkRead]]:
    return DataResponse(
        data=await service.list_social_links(db),
        meta=Meta(request_id=get_request_id(request)),
    )


@admin_router.patch("/social-links", response_model=DataResponse[list[SocialLinkRead]])
async def update_admin_social_links(
    payload: SocialSettingsUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> DataResponse[list[SocialLinkRead]]:
    items = await service.replace_social_links(
        db,
        payload=payload,
        actor=current_user,
        request_id=get_request_id(request),
    )
    return DataResponse(data=items, meta=Meta(request_id=get_request_id(request)))


@public_router.get("", response_model=DataResponse[PublicSiteData])
async def get_public_site(request: Request, db: DbSession) -> DataResponse[PublicSiteData]:
    data = PublicSiteData(
        profile=await service.get_profile_read(db),
        settings=await service.get_site_settings_read(db),
        history=await service.list_history(db),
        contacts=await service.list_contacts(db, public_only=True),
        social_links=await service.list_social_links(db, public_only=True),
    )
    return DataResponse(data=data, meta=Meta(request_id=get_request_id(request)))
