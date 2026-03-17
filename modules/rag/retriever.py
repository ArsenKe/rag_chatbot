"""Similarity search / retriever logic using Chroma"""

from modules.rag.vector_store import VectorStore
from app.core.config import Settings
from typing import List, Dict


class Retriever:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.vector_store = VectorStore(settings)

    def retrieve(self, query: str, k: int = None) -> List[Dict]:
        """Retrieve relevant documents for a query"""
        if k is None:
            k = self.settings.top_k_retrieval
        
        try:
            results = self.vector_store.search(query, k=k)
            return results
        except Exception as e:
            print(f"Error in retriever: {e}")
            return []

    def retrieve_by_metadata(self, metadata_filter: Dict, k: int = None) -> List[Dict]:
        """Retrieve documents by metadata"""
        try:
            # This is a simple implementation
            # For production, implement proper metadata filtering in Chroma
            return []
        except Exception as e:
            print(f"Error in metadata retrieval: {e}")
            return []
