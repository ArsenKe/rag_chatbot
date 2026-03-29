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

            # Build context from normalized snippets so encoding artifacts do not leak into answers.
            context = "\n\n".join([
                f"• {self._normalize_text(doc.get('content', ''))[:300]}..." for doc in docs
            ])

            # Create prompt
            system_prompt = "Du bist ein hilfreicher Kundenservice-Chatbot für Royal E-Cars."
            user_prompt = f"""Basierend auf diesen Informationen:

{context}

Beantworte: {question}"""

            # Call OpenAI
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=300
                )
                return self._normalize_text(response.choices[0].message.content)
            except Exception:
                # Keep the API useful even if the LLM provider is temporarily unavailable.
                return self._fallback_answer(question, docs)
        except Exception as e:
            return f"Fehler: {str(e)}"

    def _fallback_answer(self, question: str, docs: List[Dict]) -> str:
        """Return a deterministic context-only answer when OpenAI is unavailable."""
        snippets = []
        for doc in docs[:3]:
            text = self._normalize_text(doc.get("content", "").strip()).replace("\n", " ")
            if text:
                snippets.append(text[:220])

        if not snippets:
            return "Ich konnte keine relevanten Informationen finden."

        context_text = " | ".join(snippets)
        return (
            "Basierend auf den gespeicherten Daten (ohne Live-LLM-Antwort): "
            f"{context_text}"
        )

    def _normalize_text(self, text: str) -> str:
        """Repair common mojibake artifacts (e.g., HÃ¤ufig -> Häufig, â‚¬ -> €)."""
        if not text:
            return ""

        text = text.replace("\u00a0", " ").replace("\r\n", "\n")

        def _score_mojibake(value: str) -> int:
            markers = ("Ã", "â", "Â", "ð", "�")
            return sum(value.count(marker) for marker in markers)

        repaired = text
        try:
            candidate = text.encode("latin-1", errors="strict").decode("utf-8", errors="strict")
            if _score_mojibake(candidate) < _score_mojibake(text):
                repaired = candidate
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

        # Clean up the most common leftovers even if full conversion wasn't possible.
        replacements = {
            "â‚¬": "€",
            "â€“": "–",
            "â€”": "—",
            "â€ž": "„",
            "â€œ": "“",
            "â€\x9d": "”",
            "â€\x99": "’",
            "â€¦": "…",
            "Â°": "°",
        }
        for broken, fixed in replacements.items():
            repaired = repaired.replace(broken, fixed)

        return repaired


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
