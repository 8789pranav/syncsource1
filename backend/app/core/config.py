from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Nexus HR API"
    API_V1_PREFIX: str = "/api"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./prisma/dev.db"

    # Auth
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Rate limiting
    RATE_LIMIT_MAX: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Default tenant
    DEFAULT_TENANT_ID: str = "tenant-default-hrms"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
