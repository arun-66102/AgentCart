from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    # LLM
    groq_api_key: str = ""

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    # Database — must be set via environment variable (Neon PostgreSQL)
    database_url: str = ""

    # App
    secret_key: str = "changeme_random_secret_key"
    debug: bool = True
    frontend_url: str = "https://agent-cart-i59ihvfwl-arun-66102s-projects.vercel.app"

    # Merchant policy defaults
    max_discount_pct: float = 10.0          # max discount % the agent can offer
    max_autonomous_offer_inr: float = 1000.0  # max value of unsolicited offer
    min_margin_pct: float = 15.0            # minimum profit margin
    max_upsell_value_inr: float = 3000.0    # max upsell price delta
    allowed_categories: list[str] = [
        "headphones", "earbuds", "keyboard", "mouse",
        "laptop", "speakers", "webcam", "accessories",
        "monitor", "tablet", "smartwatch", "powerbank",
        "storage", "networking",
    ]

    model_config = SettingsConfigDict(
        env_file=(
            str(BASE_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
