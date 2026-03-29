from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from modules.rag.qa_chain import RAGChain
from modules.rag.vector_store import VectorStore
from app.core.config import Settings
from fastapi.middleware.cors import CORSMiddleware
import os
from database.seed_database import SAMPLE_DOCUMENTS

# Import routers
from app.webhooks import router as webhook_router
from app.data_manager import router as data_router

app = FastAPI(title="Royal E-Cars Chatbot")
settings = Settings()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
rag = RAGChain(settings)


@app.on_event("startup")
async def seed_on_startup():
    """Auto-seed sample data in empty deployments (useful for fresh Railway instances)."""
    if not settings.auto_seed_sample_data:
        return

    try:
        vector_store = VectorStore(settings)
        info = vector_store.get_collection_info()
        if info.get("document_count", 0) == 0:
            vector_store.add_documents(SAMPLE_DOCUMENTS)
            print("✅ Auto-seeded sample RAG documents")
    except Exception as exc:
        print(f"⚠️ Auto-seed skipped: {exc}")

# Include routers
app.include_router(webhook_router)
app.include_router(data_router)

class Question(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ask")
def ask(question: Question):
    answer = rag.answer_question(question.text)
    return {"question": question.text, "answer": answer}

@app.get("/")
def root():
    if os.path.exists("static/chat.html"):
        return FileResponse("static/chat.html", media_type="text/html")
    return {
        "message": "Royal E-Cars Chatbot API",
        "docs": "/docs",
        "data_endpoints": "/data/stats"
    }

# Mount static files if directory exists
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")