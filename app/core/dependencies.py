# Shared dependencies for FastAPI endpoints
from typing import Generator
from modules.rag.vector_store import get_collection
from modules.whatsapp.twilio_client import get_twilio_client


def get_vector_store():
    """Dependency: Get vector store collection"""
    collection = get_collection("royal_ecars_documents")
    return collection


def get_twilio():
    """Dependency: Get Twilio client"""
    return get_twilio_client()


async def get_db() -> Generator:
    """Placeholder for future database dependency."""
    yield None
