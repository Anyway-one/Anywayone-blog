from fastapi import APIRouter, Request

from app.api.schemas import DataResponse, Meta
from app.core.request_id import get_request_id
from app.modules.auth.dependencies import CurrentUser, DbSession
from app.modules.site import service
from app.modules.site.schemas import (
    ContactMethodRead,
    ContactSettingsUpdate,
    PublicSiteData,
    SiteProfileRead,
    SiteProfileUpdate,
    SiteSettingsRead,
    SiteSettingsUpdate,
    SocialLinkRead,
    SocialSettingsUpdate,
)

admin_router = APIRouter(prefix="/admin/settings", tags=["admin-site-settings"])
public_router = APIRouter(prefix="/public/site", tags=["public-site-settings"])


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
        contacts=await service.list_contacts(db, public_only=True),
        social_links=await service.list_social_links(db, public_only=True),
    )
    return DataResponse(data=data, meta=Meta(request_id=get_request_id(request)))
