"""Data management endpoints"""

from fastapi import APIRouter, File, UploadFile, Form
from modules.rag.vector_store import VectorStore
from modules.data_ingestion.web_scraper import WebScraper
from modules.data_ingestion.embeddings import EmbeddingGenerator
from app.core.config import Settings
from typing import List
import asyncio

router = APIRouter(prefix="/data", tags=["data"])

settings = Settings()
vs = VectorStore(settings)
embedder = EmbeddingGenerator(settings.openai_api_key)

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process document"""
    try:
        content = await file.read()
        text = content.decode('utf-8', errors='ignore')
        
        # Add to vector store
        doc_id = file.filename.replace('.', '_')
        embedding = embedder.generate_embedding(text[:500])
        
        vs.collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{"source": f"Uploaded: {file.filename}"}]
        )
        
        return {
            "status": "success",
            "message": f"Document '{file.filename}' uploaded and indexed",
            "doc_id": doc_id
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/scrape-urls")
async def scrape_urls(urls: List[str] = Form(...)):
    """Scrape and index URLs"""
    try:
        scraper = WebScraper()
        documents = scraper.scrape_urls(urls)
        
        # Add to vector store
        for doc in documents:
            embedding = embedder.generate_embedding(doc['content'][:500])
            vs.collection.add(
                ids=[doc['id']],
                embeddings=[embedding],
                documents=[doc['content']],
                metadatas=[doc['metadata']]
            )
        
        return {
            "status": "success",
            "message": f"Scraped and indexed {len(documents)} documents",
            "documents": len(documents)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/scrape-gdrive")
async def scrape_gdrive(folder_id: str = Form(...)):
    """Scrape Google Drive folder"""
    try:
        from modules.data_ingestion.gdrive_loader import GoogleDriveLoader
        
        loader = GoogleDriveLoader(settings.gdrive_credentials_path)
        documents = loader.load_documents(folder_id)
        
        # Add to vector store
        for doc in documents:
            embedding = embedder.generate_embedding(doc['content'][:500])
            vs.collection.add(
                ids=[doc['id']],
                embeddings=[embedding],
                documents=[doc['content']],
                metadatas=[doc['metadata']]
            )
        
        return {
            "status": "success",
            "message": f"Imported {len(documents)} documents from Google Drive",
            "documents": len(documents)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stats")
def get_stats():
    """Get data statistics"""
    info = vs.get_collection_info()
    return {
        "total_documents": info.get("document_count", 0),
        "status": "ok"
    }

@router.delete("/document/{doc_id}")
def delete_document(doc_id: str):
    """Delete document from vector store"""
    try:
        vs.collection.delete(ids=[doc_id])
        return {"status": "success", "message": f"Document {doc_id} deleted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}