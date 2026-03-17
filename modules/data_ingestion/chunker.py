"""Text chunking utilities"""

def chunk_text(text: str, chunk_size: int = 500):
    """Yield chunks of text."""
    for i in range(0, len(text), chunk_size):
        yield text[i : i + chunk_size]
