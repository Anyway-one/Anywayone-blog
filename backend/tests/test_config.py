import pytest

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
