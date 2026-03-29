"""ChromaDB initialization & vector store management"""

import chromadb
from chromadb.config import Settings as ChromaClientSettings
from modules.data_ingestion.embeddings import EmbeddingGenerator
from app.core.config import Settings
from typing import List, Dict
import os

class VectorStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.embedding_generator = EmbeddingGenerator(
            api_key=settings.openai_api_key,
            model=settings.embedding_model
        )
        
        # Create persist directory if it doesn't exist
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        
        # Initialize Chroma client - use newer API
        try:
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaClientSettings(anonymized_telemetry=False)
            )
        except Exception as e:
            print(f"Chroma initialization error: {e}")
            self.client = chromadb.EphemeralClient()
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="royal_ecars"
        )

    def add_documents(self, documents: List[Dict]) -> None:
        """Add documents to vector store"""
        try:
            for idx, doc in enumerate(documents):
                # Generate embedding
                embedding = self.embedding_generator.generate_embedding(doc['content'])
                
                self.collection.add(
                    ids=[doc.get('id', f'doc_{idx}')],
                    embeddings=[embedding],
                    documents=[doc['content']],
                    metadatas=[doc.get('metadata', {})]
                )
            
            print(f"✅ Added {len(documents)} documents to vector store")
        except Exception as e:
            print(f"Error adding documents: {e}")

    def search(self, query: str, k: int = 5) -> List[Dict]:
        """Search for similar documents"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_generator.generate_embedding(query)
            
            # Search in Chroma
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k
            )
            
            # Format results
            documents = []
            if results['documents'] and len(results['documents']) > 0:
                for i, doc_text in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else 0
                    
                    documents.append({
                        'content': doc_text,
                        'metadata': metadata,
                        'distance': float(distance)
                    })
            
            return documents
        except Exception as e:
            print(f"Error searching: {e}")
            return []

    def delete_all(self) -> None:
        """Clear the collection"""
        try:
            self.client.delete_collection(name="royal_ecars")
            self.collection = self.client.get_or_create_collection(name="royal_ecars")
            print("✅ Vector store cleared")
        except Exception as e:
            print(f"Error clearing: {e}")

    def get_collection_info(self) -> Dict:
        """Get collection info"""
        try:
            count = self.collection.count()
            return {"document_count": count}
        except Exception as e:
            print(f"Error: {e}")
            return {"document_count": 0}


# Legacy functions
def init_vector_store(collection_name: str):
    settings = Settings()
    return VectorStore(settings).collection

def add_documents_to_store(documents: List[Dict], collection_name: str):
    settings = Settings()
    vs = VectorStore(settings)
    vs.add_documents(documents)

def generate_embedding(text: str) -> List[float]:
    settings = Settings()
    eg = EmbeddingGenerator(settings.openai_api_key)
    return eg.generate_embedding(text)
