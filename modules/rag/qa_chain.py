"""LangChain QA chain for RAG-based question answering"""

from openai import OpenAI
from modules.rag.vector_store import VectorStore
from app.core.config import Settings
from typing import Dict, List
import re


class RAGChain:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.vector_store = VectorStore(settings)

    def answer_question(self, question: str, history: List[Dict[str, str]] | None = None) -> str:
        """Answer question using RAG"""
        try:
            # Retrieve documents
            docs = self.vector_store.search(question, k=max(5, self.settings.top_k_retrieval))
            
            if not docs:
                return "Ich konnte keine relevanten Informationen finden."

            context = self._build_context(docs)

            # Create prompt
            history_block = self._build_history(history)

            system_prompt = (
                "You are a helpful customer service chatbot for Royal E-Cars. "
                "Use only information from the provided context. "
                "If information is missing, say so clearly. "
                "Reply in the same language as the user's latest message. "
                "If the user sends a short follow-up like 'ja/yes/ok', keep the current conversation language. "
                "Do not switch language unless the user explicitly asks. "
                "Keep answers concise (2-5 short sentences or short bullets). "
                "Answer only the asked intent, do not dump unrelated FAQs. "
                "Never invent or guess contact details (phone/email/address). "
                "If contact details are absent, unclear, or look like placeholders, state that you cannot verify and ask user to check the official website or office."
            )
            user_prompt = f"""Kontext:

{context}

Letzte Nachrichten (optional):
{history_block}

Frage: {question}

Antwortregeln:
- Antworte knapp und vollständig.
- Nenne konkrete Zahlen, Preise oder Zeiten, falls im Kontext vorhanden.
- Wenn die Frage nicht im Kontext beantwortbar ist, sage das direkt.
- Wenn der Nutzer eine Bestätigung verlangt (z. B. 'are you sure?'), bestätige nur mit belegbaren Kontextdaten."""

            # Call OpenAI
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=450
                )
                answer = self._normalize_text(response.choices[0].message.content)
                return self._clean_answer(answer)
            except Exception:
                # Keep the API useful even if the LLM provider is temporarily unavailable.
                return self._fallback_answer(question, docs)
        except Exception as e:
            return f"Fehler: {str(e)}"

    def answer_with_sources(self, question: str, history: List[Dict[str, str]] | None = None) -> Dict:
        """Answer question using RAG and return answer with source citations."""
        category_labels = {
            "fleet_info": "Fleet Information",
            "booking_info": "Booking Options",
            "premium_services": "Premium Services",
            "policies": "Policies & Terms",
            "faqs": "FAQs",
        }
        try:
            docs = self.vector_store.search(question, k=5)

            if not docs:
                return {
                    "answer": self._not_found_message(question, history),
                    "sources": []
                }

            seen: set = set()
            sources: List[Dict] = []
            for doc in docs:
                meta = doc.get("metadata", {})
                raw_url = meta.get("source", "")
                category = meta.get("category", "")
                title = category_labels.get(
                    category,
                    category.replace("_", " ").title() if category else "Knowledge Base"
                )
                url = raw_url if raw_url.startswith("http") else None
                key = url or title
                if key not in seen:
                    seen.add(key)
                    sources.append({"title": title, "url": url})

            context = self._build_context(docs)
            history_block = self._build_history(history)
            system_prompt = (
                "You are a helpful customer service chatbot for Royal E-Cars. "
                "Use only information from the provided context. "
                "If information is missing, say so clearly. "
                "Reply in the same language as the user's latest message. "
                "If the user sends a short follow-up like 'ja/yes/ok', keep the current conversation language. "
                "Do not switch language unless the user explicitly asks. "
                "Keep answers concise. "
                "Answer only the asked intent, do not dump unrelated FAQs. "
                "Never invent or guess contact details (phone/email/address). "
                "If contact details are absent, unclear, or look like placeholders, say you cannot verify and ask user to check the official website or office."
            )
            user_prompt = (
                f"Kontext:\n\n{context}\n\n"
                f"Letzte Nachrichten (optional):\n{history_block}\n\n"
                f"Frage: {question}\n\n"
                "Antworte knapp und vollständig."
            )

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=450
                )
                answer = self._clean_answer(self._normalize_text(response.choices[0].message.content))
            except Exception:
                answer = self._fallback_answer(question, docs)

            return {"answer": answer, "sources": sources}
        except Exception as e:
            return {"answer": f"Error: {str(e)}", "sources": []}

    def _fallback_answer(self, question: str, docs: List[Dict]) -> str:
        """Return a deterministic context-only answer when OpenAI is unavailable."""
        bullets = []
        for doc in docs[:3]:
            text = self._normalize_text(doc.get("content", "").strip()).replace("\n", " ")
            if text:
                bullets.append(text[:180])

        if not bullets:
            return "Ich konnte keine relevanten Informationen finden."

        context_text = "\n".join([f"- {line}" for line in bullets])
        return (
            "Basierend auf den gespeicherten Daten (ohne Live-LLM-Antwort):\n"
            f"{context_text}"
        )

    def _build_context(self, docs: List[Dict], max_chars: int = 2400) -> str:
        parts: List[str] = []
        total = 0
        for doc in docs:
            content = self._normalize_text(doc.get("content", "")).strip()
            if not content:
                continue
            snippet = content[:420]
            candidate = f"• {snippet}"
            if total + len(candidate) > max_chars:
                break
            parts.append(candidate)
            total += len(candidate)

        return "\n\n".join(parts)

    def _build_history(self, history: List[Dict[str, str]] | None, max_turns: int = 6, max_chars: int = 900) -> str:
        if not history:
            return "(keine)"

        selected = history[-max_turns:]
        lines: List[str] = []
        total = 0
        for item in selected:
            role = (item.get("role") or "user").strip().lower()
            text = self._normalize_text((item.get("text") or "").strip())
            if not text:
                continue
            speaker = "User" if role == "user" else "Assistant"
            line = f"- {speaker}: {text[:220]}"
            if total + len(line) > max_chars:
                break
            lines.append(line)
            total += len(line)

        return "\n".join(lines) if lines else "(keine)"

    def _clean_answer(self, answer: str) -> str:
        answer = (answer or "").strip()
        # Remove obviously truncated trailing fragments.
        answer = re.sub(r"\bWelche\s+[A-Za-zÄÖÜäöüß]{0,10}$", "", answer).strip()
        if answer.endswith("..."):
            answer = answer[:-3].rstrip()
        return answer

    def _not_found_message(self, question: str, history: List[Dict[str, str]] | None = None) -> str:
        lang = self._detect_language(question, history)
        if lang == "de":
            return "Ich konnte dazu keine verlässliche Antwort in der Wissensdatenbank finden. Bitte kontaktieren Sie unser Büro."
        return "I couldn't find a reliable answer in the knowledge base for that. Please contact our office."

    def _detect_language(self, question: str, history: List[Dict[str, str]] | None = None) -> str:
        text = (question or "").strip().lower()
        if not text and history:
            for item in reversed(history):
                if (item.get("role") or "") == "user" and (item.get("text") or "").strip():
                    text = item.get("text", "").strip().lower()
                    break

        german_markers = (
            "wie", "was", "warum", "bitte", "danke", "buch", "büro", "kontakt", "telefon", "ja", "nein", "häufig"
        )
        english_markers = (
            "how", "what", "why", "please", "thanks", "book", "office", "contact", "phone", "yes", "no"
        )

        de_hits = sum(1 for marker in german_markers if marker in text)
        en_hits = sum(1 for marker in english_markers if marker in text)
        return "de" if de_hits >= en_hits else "en"

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
