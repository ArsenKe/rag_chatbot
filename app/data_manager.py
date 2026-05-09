"""Data management endpoints"""

from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException
from modules.rag.vector_store import VectorStore
from modules.data_ingestion.web_scraper import WebScraper
from modules.data_ingestion.embeddings import EmbeddingGenerator
from database.seed_database import SAMPLE_DOCUMENTS
from app.core.config import Settings
from typing import List

router = APIRouter(prefix="/data", tags=["data"])

settings = Settings()
vs = VectorStore(settings)
embedder = EmbeddingGenerator(settings.openai_api_key)


def require_admin_token(header_token: str | None, *, for_stats: bool = False):
    """Protect ingestion endpoints from direct public access."""
    if for_stats and not settings.rag_protect_stats:
        return

    expected = settings.rag_admin_token
    if not expected:
        raise HTTPException(status_code=500, detail="RAG_ADMIN_TOKEN is not configured")

    if not header_token or header_token != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")
):
    """Upload and process document"""
    require_admin_token(x_rag_admin_token)

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
async def scrape_urls(
    urls: List[str] = Form(...),
    x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")
):
    """Scrape and index URLs"""
    require_admin_token(x_rag_admin_token)

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
async def scrape_gdrive(
    folder_id: str = Form(...),
    x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")
):
    """Scrape Google Drive folder"""
    require_admin_token(x_rag_admin_token)

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
def get_stats(x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")):
    """Get data statistics"""
    require_admin_token(x_rag_admin_token, for_stats=True)

    info = vs.get_collection_info()
    return {
        "total_documents": info.get("document_count", 0),
        "status": "ok"
    }


@router.post("/seed-sample")
def seed_sample_data(
    force: bool = False,
    x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")
):
    """Seed sample documents into the vector store."""
    require_admin_token(x_rag_admin_token)

    try:
        info_before = vs.get_collection_info()
        count_before = info_before.get("document_count", 0)

        if count_before > 0 and not force:
            return {
                "status": "skipped",
                "message": "Collection is not empty. Use force=true to seed anyway.",
                "documents_before": count_before
            }

        if force:
            vs.delete_all()

        vs.add_documents(SAMPLE_DOCUMENTS)
        info_after = vs.get_collection_info()

        return {
            "status": "success",
            "documents_before": count_before,
            "documents_after": info_after.get("document_count", 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.delete("/document/{doc_id}")
def delete_document(
    doc_id: str,
    x_rag_admin_token: str | None = Header(default=None, alias="X-RAG-ADMIN-TOKEN")
):
    """Delete document from vector store"""
    require_admin_token(x_rag_admin_token)

    try:
        vs.collection.delete(ids=[doc_id])
        return {"status": "success", "message": f"Document {doc_id} deleted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}