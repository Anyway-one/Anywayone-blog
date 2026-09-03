import pytest
from pydantic import SecretStr

from app.core.config import Settings


def test_parse_comma_separated_cors_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_HOST", "localhost")
    monkeypatch.setenv("DATABASE_NAME", "anywayone_test")
    monkeypatch.setenv("DATABASE_USER", "anywayone")
    monkeypatch.setenv("DATABASE_PASSWORD", "test-password")
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "https://www.anywayone.com, https://admin.anywayone.com",
    )

    settings = Settings()  # type: ignore[call-arg]

    assert settings.cors_origins == [
        "https://www.anywayone.com",
        "https://admin.anywayone.com",
    ]


def test_r2_storage_requires_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_HOST", "localhost")
    monkeypatch.setenv("DATABASE_NAME", "anywayone_test")
    monkeypatch.setenv("DATABASE_USER", "anywayone")
    monkeypatch.setenv("DATABASE_PASSWORD", "test-password")
    settings = Settings(media_storage_backend="r2")  # type: ignore[call-arg]

    with pytest.raises(ValueError, match="R2_ACCOUNT_ID"):
        settings.validate_production_settings()


def test_r2_storage_accepts_bucket_configuration() -> None:
    settings = Settings(  # type: ignore[call-arg]
        media_storage_backend="r2",
        media_public_url="https://cdn.example.com",
        r2_account_id="account",
        r2_access_key_id="access",
        r2_secret_access_key=SecretStr("secret"),
        r2_bucket_name="media",
        database_host="localhost",
        database_name="anywayone_test",
        database_user="anywayone",
        database_password=SecretStr("test-password"),
    )

    settings.validate_production_settings()
