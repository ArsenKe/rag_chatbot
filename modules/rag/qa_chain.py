"""LangChain QA chain for RAG-based question answering"""

from openai import OpenAI
from modules.rag.vector_store import VectorStore
from app.core.config import Settings
from typing import Dict, List


class RAGChain:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.vector_store = VectorStore(settings)

    def answer_question(self, question: str) -> str:
        """Answer question using RAG"""
        try:
            # Retrieve documents
            docs = self.vector_store.search(question, k=5)
            
            if not docs:
                return "Ich konnte keine relevanten Informationen finden."

            # Build context
            context = "\n\n".join([f"• {doc['content'][:300]}..." for doc in docs])

            # Create prompt
            system_prompt = "Du bist ein hilfreicher Kundenservice-Chatbot für Royal E-Cars."
            user_prompt = f"""Basierend auf diesen Informationen:

{context}

Beantworte: {question}"""

            # Call OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )

            return response.choices[0].message.content
        except Exception as e:
            return f"Fehler: {str(e)}"


# Global instance for backward compatibility
_rag_chain = None

def get_rag_chain():
    global _rag_chain
    if _rag_chain is None:
        settings = Settings()
        _rag_chain = RAGChain(settings)
    return _rag_chain

def answer_question(question: str) -> str:
    """Function for backward compatibility"""
    rag = get_rag_chain()
    return rag.answer_question(question)
