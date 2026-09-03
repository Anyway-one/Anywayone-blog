from pathlib import Path
from typing import Literal

import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.storage import delete_object, put_object


def _settings(tmp_path: Path, backend: Literal["local", "r2"] = "local") -> Settings:
    return Settings(  # type: ignore[call-arg]
        media_storage_backend=backend,
        media_storage_path=tmp_path,
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


async def test_local_storage_puts_and_deletes_object(tmp_path: Path) -> None:
    settings = _settings(tmp_path)

    await put_object(settings, "2026/09/image.png", b"image-data", "image/png")
    destination = tmp_path / "2026/09/image.png"
    assert destination.read_bytes() == b"image-data"

    await delete_object(settings, "2026/09/image.png")
    assert not destination.exists()


async def test_r2_storage_uploads_with_public_cache_headers(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class Client:
        def put_object(self, **kwargs: object) -> None:
            captured.update(kwargs)

    def fake_r2_client(_settings: Settings) -> Client:
        return Client()

    monkeypatch.setattr("app.core.storage._r2_client", fake_r2_client)
    await put_object(
        _settings(tmp_path, "r2"),
        "2026/09/image.png",
        b"image-data",
        "image/png",
    )

    assert captured == {
        "Bucket": "media",
        "Key": "2026/09/image.png",
        "Body": b"image-data",
        "ContentType": "image/png",
        "CacheControl": "public, max-age=31536000, immutable",
    }
