import uuid
from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.db.enums import ContactType, SocialPlatform
from app.modules.site.schemas import (
    ContactMethodInput,
    ContactSettingsUpdate,
    SiteHistoryInput,
    SiteHistoryRead,
    SiteProfileRead,
    SiteSettingsRead,
    SiteSettingsUpdate,
    SocialLinkInput,
    SocialSettingsUpdate,
)
from app.modules.site.service import contact_href


def test_profile_serializes_avatar_and_lists_as_camel_case() -> None:
    media_id = uuid.uuid4()
    profile = SiteProfileRead(
        avatar_media_id=media_id,
        avatar_public_url="https://api.anywayone.com/media/avatar.webp",
        public_name="Anywayone",
        interests=["摄影", "跑步"],
    )

    data = profile.model_dump(by_alias=True, mode="json")

    assert data["avatarMediaId"] == str(media_id)
    assert data["avatarPublicUrl"].endswith("avatar.webp")
    assert data["publicName"] == "Anywayone"
    assert data["interests"] == ["摄影", "跑步"]


def test_site_settings_serialize_launch_date_as_camel_case() -> None:
    settings = SiteSettingsRead(launch_date=date(2026, 1, 1))

    data = settings.model_dump(by_alias=True, mode="json")

    assert data["launchDate"] == "2026-01-01"


def test_launch_date_cannot_be_in_the_future() -> None:
    with pytest.raises(ValidationError):
        SiteSettingsUpdate(launch_date=date.today() + timedelta(days=1))


def test_site_history_serializes_media_and_date_as_camel_case() -> None:
    media_id = uuid.uuid4()
    item = SiteHistoryRead(
        id=uuid.uuid4(),
        event_date=date(2026, 8, 28),
        name="2.0 版本发布",
        description="完成首页改版。",
        image_media_id=media_id,
        image_public_url="https://api.anywayone.com/media/history.webp",
        image_width=1600,
        image_height=900,
    )

    data = item.model_dump(by_alias=True, mode="json")

    assert data["eventDate"] == "2026-08-28"
    assert data["imageMediaId"] == str(media_id)
    assert data["imagePublicUrl"].endswith("history.webp")


def test_site_history_rejects_future_dates_and_blank_text() -> None:
    with pytest.raises(ValidationError):
        SiteHistoryInput(
            event_date=date.today() + timedelta(days=1),
            name="未来事件",
            description="尚未发生。",
        )

    with pytest.raises(ValidationError):
        SiteHistoryInput(event_date=date.today(), name="  ", description="说明")


def test_qr_code_is_only_available_for_supported_contacts() -> None:
    with pytest.raises(ValidationError):
        ContactMethodInput(
            contact_type=ContactType.EMAIL,
            value="hello@example.com",
            qr_media_id=uuid.uuid4(),
        )


def test_contact_types_cannot_be_duplicated() -> None:
    item = ContactMethodInput(contact_type=ContactType.WECHAT, value="anywayone")
    with pytest.raises(ValidationError):
        ContactSettingsUpdate(items=[item, item])


def test_contact_links_are_generated_for_linkable_channels() -> None:
    assert contact_href(ContactType.EMAIL, "hello@example.com") == "mailto:hello@example.com"
    assert contact_href(ContactType.PHONE, "+86 138-0000-0000") == "tel:+8613800000000"
    assert contact_href(ContactType.WHATSAPP, "+86 138-0000-0000") == (
        "https://wa.me/8613800000000"
    )
    assert contact_href(ContactType.TELEGRAM, "@anywayone") == "https://t.me/anywayone"


def test_social_platforms_require_content_and_cannot_be_duplicated() -> None:
    with pytest.raises(ValidationError):
        SocialLinkInput(platform=SocialPlatform.GITHUB)

    item = SocialLinkInput.model_validate(
        {
            "platform": SocialPlatform.GITHUB,
            "account_name": "anywayone",
            "url": "https://github.com/anywayone",
        }
    )
    with pytest.raises(ValidationError):
        SocialSettingsUpdate(items=[item, item])
