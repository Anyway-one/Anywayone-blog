import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.core.errors import AppError

password_hash = PasswordHash.recommended()
dummy_password_hash = password_hash.hash("anywayone-invalid-login-placeholder")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_hash: str) -> bool:
    return password_hash.verify(password, encoded_hash)


def verify_dummy_password(password: str) -> None:
    password_hash.verify(password, dummy_password_hash)


def create_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "access",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": expires,
        "iss": "anywayone-api",
    }
    token = jwt.encode(  # pyright: ignore[reportUnknownMemberType]
        payload,
        settings.secret_key.get_secret_value(),
        algorithm="HS256",
    )
    return token, settings.access_token_expire_minutes * 60


def decode_access_token(token: str) -> uuid.UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(  # pyright: ignore[reportUnknownMemberType]
            token,
            settings.secret_key.get_secret_value(),
            algorithms=["HS256"],
            issuer="anywayone-api",
            options={"require": ["sub", "type", "exp", "iat", "jti"]},
        )
        if payload.get("type") != "access":
            raise InvalidTokenError
        return uuid.UUID(str(payload["sub"]))
    except (InvalidTokenError, ValueError, TypeError) as exc:
        raise AppError(
            status_code=401,
            code="SESSION_EXPIRED",
            message="登录状态已失效，请重新登录。",
        ) from exc


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_ip(ip_address: str | None) -> str | None:
    if not ip_address:
        return None
    secret = get_settings().secret_key.get_secret_value().encode("utf-8")
    return hmac.new(secret, ip_address.encode("utf-8"), hashlib.sha256).hexdigest()
