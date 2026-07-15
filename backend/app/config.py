from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./knasta.db"
    scraper_interval_minutes: int = 60
    embedding_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"


settings = Settings()
