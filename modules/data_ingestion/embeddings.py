"""Embeddings generation using OpenAI API"""

from typing import List
import hashlib
import math

try:
    from openai import OpenAI
    OPENAI_V1 = True
except ImportError:
    import openai
    OPENAI_V1 = False

class EmbeddingGenerator:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.api_key = api_key
        self.model = model
        self.dimension = 1536
        self._warned_remote_failure = False
        self._use_remote_api = bool(api_key)
        
        if OPENAI_V1 and self._use_remote_api:
            self.client = OpenAI(api_key=api_key)
        elif not OPENAI_V1 and self._use_remote_api:
            openai.api_key = api_key

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for given text using OpenAI API"""
        if not self._use_remote_api:
            return self._local_embedding(text)

        try:
            if OPENAI_V1:
                response = self.client.embeddings.create(
                    input=text,
                    model=self.model
                )
                return response.data[0].embedding
            else:
                response = openai.Embedding.create(
                    input=text,
                    model=self.model
                )
                return response["data"][0]["embedding"]
        except Exception as e:
            if not self._warned_remote_failure:
                print(f"Warning: OpenAI embedding unavailable, using local fallback. Details: {e}")
                self._warned_remote_failure = True
            return self._local_embedding(text)

    def _local_embedding(self, text: str) -> List[float]:
        """Create deterministic fallback embedding when remote API is unavailable."""
        text = text or ""
        seed = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()

        vector: List[float] = []
        counter = 0
        while len(vector) < self.dimension:
            block = hashlib.sha256(seed + counter.to_bytes(4, "little")).digest()
            for byte in block:
                # Map byte [0,255] -> [-1,1]
                vector.append((byte / 127.5) - 1.0)
                if len(vector) >= self.dimension:
                    break
            counter += 1

        # L2 normalize so similarity math stays stable.
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    def batch_embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
