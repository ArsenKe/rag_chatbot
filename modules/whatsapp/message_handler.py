"""WhatsApp message handler"""

from modules.rag.qa_chain import answer_question
from typing import Dict


def handle_message(message: Dict) -> str:
    """Handle incoming WhatsApp message"""
    try:
        text = message.get('Body', '')
        if not text:
            return "Bitte sende eine Nachricht."
        
        # Get answer from RAG
        response = answer_question(text)
        return response
    except Exception as e:
        return f"Fehler: {str(e)}"
