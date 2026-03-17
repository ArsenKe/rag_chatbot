from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from modules.rag.qa_chain import RAGChain
from app.core.config import Settings
from fastapi.middleware.cors import CORSMiddleware
import os

# Import routers
from app.webhooks import router as webhook_router
from app.data_manager import router as data_router

app = FastAPI(title="Royal E-Cars Chatbot")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = Settings()
rag = RAGChain(settings)

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
    return {
        "message": "Royal E-Cars Chatbot API",
        "docs": "/docs",
        "data_endpoints": "/data/stats"
    }

# Mount static files if directory exists
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")