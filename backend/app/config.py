from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Keep your existing settings here.
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = "llama-3.3-70b-versatile"

    database_path: str = "storage/medidoc.db"
    upload_dir: str = "storage/uploads"
    quarantine_dir: str = "storage/quarantine"

    max_upload_mb: int = 20
    ocr_lang: str = "en"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Authentication settings
    jwt_secret_key: str = Field(
        default="",
        validation_alias="MEDIDOC_JWT_SECRET",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def rooted_path(self, path: str):
        from pathlib import Path

        base_dir = Path(__file__).resolve().parent.parent
        return base_dir / path


settings = Settings()

if not settings.jwt_secret_key or len(settings.jwt_secret_key) < 32:
    raise RuntimeError(
        "Set MEDIDOC_JWT_SECRET in your .env file to a random secret "
        "containing at least 32 characters."
    )