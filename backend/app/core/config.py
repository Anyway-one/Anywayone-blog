from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

DEVELOPMENT_SECRET_KEY = "development-only-change-this-secret-key"  # noqa: S105


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Anywayone API"
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"

    database_host: str
    database_port: int = Field(default=5432, ge=1, le=65535)
    database_name: str
    database_user: str
    database_password: SecretStr
    database_ssl_mode: Literal[
        "disable", "allow", "prefer", "require", "verify-ca", "verify-full"
    ] = "prefer"
    database_pool_size: int = Field(default=5, ge=1, le=30)
    database_max_overflow: int = Field(default=5, ge=0, le=30)

    secret_key: SecretStr = SecretStr(DEVELOPMENT_SECRET_KEY)
    access_token_expire_minutes: int = Field(default=15, ge=5, le=1440)
    refresh_token_expire_days: int = Field(default=30, ge=1, le=365)
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    cookie_secure: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: SecretStr) -> SecretStr:
        # Production validation also runs in validate_production_settings at startup.
        if not value.get_secret_value():
            raise ValueError("SECRET_KEY must not be empty")
        return value

    @computed_field
    @property
    def database_url(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.database_user,
            password=self.database_password.get_secret_value(),
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
            query={"sslmode": self.database_ssl_mode},
        )

    def validate_production_settings(self) -> None:
        if self.app_env != "production":
            return
        secret_key = self.secret_key.get_secret_value()
        if len(secret_key) < 32 or secret_key == DEVELOPMENT_SECRET_KEY:
            raise ValueError("SECRET_KEY must contain at least 32 characters in production")
        if not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()  # type: ignore[call-arg]
    settings.validate_production_settings()
    return settings
