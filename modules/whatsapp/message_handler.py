"""WhatsApp message handler"""

from collections import defaultdict, deque
from modules.rag.qa_chain import get_rag_chain
from typing import Dict


# Keep a small in-memory context per sender to improve follow-up quality.
_history_by_sender: dict[str, deque[Dict[str, str]]] = defaultdict(lambda: deque(maxlen=8))


def handle_message(message: Dict) -> str:
    """Handle incoming WhatsApp message"""
    try:
        text = message.get('Body', '')
        if not text:
            return "Bitte sende eine Nachricht."

        sender = str(message.get('From', '')).strip()
        history_list = list(_history_by_sender[sender]) if sender else []

        rag = get_rag_chain()
        result = rag.answer_with_sources(text, history=history_list)
        response = (result.get('answer') or '').strip()

        if sender:
            _history_by_sender[sender].append({"role": "user", "text": text})
            _history_by_sender[sender].append({"role": "assistant", "text": response})

        return response or "Ich konnte dazu leider keine verlässliche Antwort finden."
    except Exception as e:
        return f"Fehler: {str(e)}"
