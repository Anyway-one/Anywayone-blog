from enum import StrEnum


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    DISABLED = "DISABLED"


class PostStatus(StrEnum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    WITHDRAWN = "WITHDRAWN"
    ARCHIVED = "ARCHIVED"


class Visibility(StrEnum):
    PUBLIC = "PUBLIC"
    UNLISTED = "UNLISTED"


class PostVersionChangeType(StrEnum):
    AUTO_SAVE = "AUTO_SAVE"
    MANUAL_SAVE = "MANUAL_SAVE"
    PUBLISH = "PUBLISH"
    RESTORE = "RESTORE"


class ContactType(StrEnum):
    WECHAT = "WECHAT"
    QQ = "QQ"
    WHATSAPP = "WHATSAPP"
    TELEGRAM = "TELEGRAM"
    PHONE = "PHONE"
    EMAIL = "EMAIL"


class SocialPlatform(StrEnum):
    GITHUB = "GITHUB"
    X = "X"
    WEIBO = "WEIBO"
    XIAOHONGSHU = "XIAOHONGSHU"
    BILIBILI = "BILIBILI"
    INSTAGRAM = "INSTAGRAM"
    DOUYIN = "DOUYIN"
    WECHAT_CHANNELS = "WECHAT_CHANNELS"
    YOUTUBE = "YOUTUBE"
    WECHAT_OFFICIAL = "WECHAT_OFFICIAL"
