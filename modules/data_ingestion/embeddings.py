"""Embeddings generation using OpenAI API"""

from typing import List
import os

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
        
        if OPENAI_V1:
            self.client = OpenAI(api_key=api_key)
        else:
            openai.api_key = api_key

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for given text using OpenAI API"""
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
            print(f"Error generating embedding: {e}")
            return [0.0] * 1536

    def batch_embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
