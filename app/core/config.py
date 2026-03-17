from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    # Twilio Configuration
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_number: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "")
    
    # Application Configuration
    environment: str = os.getenv("ENVIRONMENT", "development")
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./database/chroma_db")
    whatsapp_webhook_secret: str = os.getenv("WHATSAPP_WEBHOOK_SECRET", "")
    
    # RAG Configuration
    top_k_retrieval: int = int(os.getenv("TOP_K_RETRIEVAL", "5"))
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "500"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env

    def validate(self) -> bool:
        """Validate required settings"""
        required = ["openai_api_key", "twilio_account_sid", "twilio_auth_token"]
        missing = [field for field in required if not getattr(self, field)]
        
        if missing:
            print(f"⚠️  Missing settings: {', '.join(missing)}")
            return False
        return True

settings = Settings()

