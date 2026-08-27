import uuid

import pytest

from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_is_not_plaintext() -> None:
    encoded = hash_password("a-secure-password")

    assert encoded != "a-secure-password"
    assert verify_password("a-secure-password", encoded)
    assert not verify_password("wrong-password", encoded)


def test_access_token_round_trip() -> None:
    user_id = uuid.uuid4()
    token, expires_in = create_access_token(user_id)

    assert expires_in > 0
    assert decode_access_token(token) == user_id


def test_invalid_access_token_has_stable_error() -> None:
    with pytest.raises(AppError) as exc_info:
        decode_access_token("invalid-token")

    assert exc_info.value.code == "SESSION_EXPIRED"
