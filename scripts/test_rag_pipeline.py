"""
Comprehensive RAG Pipeline Tests
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import Settings

def print_header(title):
    print("\n" + "="*60)
    print(f"🧪 {title}")
    print("="*60)

def test_embeddings():
    """Test embedding generation"""
    print_header("Testing Embeddings")
    try:
        from modules.data_ingestion.embeddings import EmbeddingGenerator
        
        settings = Settings()
        gen = EmbeddingGenerator(settings.openai_api_key)
        
        text = "Welche Fahrzeuge habt ihr?"
        embedding = gen.generate_embedding(text)
        
        assert len(embedding) == 1536, f"Expected 1536 dimensions, got {len(embedding)}"
        assert isinstance(embedding[0], float), "Embedding values should be floats"
        
        print(f"✅ Generated embedding: {len(embedding)} dimensions")
        print(f"✅ First 5 values: {embedding[:5]}")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_vector_store():
    """Test vector store operations"""
    print_header("Testing Vector Store")
    try:
        from modules.rag.vector_store import VectorStore
        from app.core.config import Settings
        
        settings = Settings()
        vs = VectorStore(settings)
        
        info = vs.get_collection_info()
        print(f"✅ Vector store info: {info}")
        assert "document_count" in info, "Should have document count"
        assert info["document_count"] > 0, "Should have documents"
        
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_retriever():
    """Test vector retriever"""
    print_header("Testing Retriever Module")
    try:
        from modules.rag.retriever import Retriever
        from app.core.config import Settings
        
        settings = Settings()
        retriever = Retriever(settings)
        
        query = "Welche Fahrzeuge bietet ihr an?"
        results = retriever.retrieve(query, k=3)
        
        assert isinstance(results, list), "Results should be a list"
        assert len(results) > 0, "Should retrieve at least one document"
        
        print(f"✅ Retrieved {len(results)} documents")
        for i, doc in enumerate(results):
            print(f"  {i+1}. {doc['content'][:100]}...")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_qa_chain():
    """Test complete RAG QA chain"""
    print_header("Testing QA Chain (RAG)")
    try:
        from modules.rag.qa_chain import RAGChain
        from app.core.config import Settings
        
        settings = Settings()
        rag = RAGChain(settings)
        
        questions = [
            "Welche Fahrzeuge bietet Royal E-Cars an?",
            "Wie viel kostet die Wien Tour?",
            "Bietet ihr Champagne Service an?"
        ]
        
        for q in questions:
            print(f"\n❓ Question: {q}")
            answer = rag.answer_question(q)
            assert isinstance(answer, str), "Answer should be a string"
            assert len(answer) > 0, "Answer should not be empty"
            print(f"✅ Answer: {answer[:150]}...")
        
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_message_handler():
    """Test WhatsApp message handler"""
    print_header("Testing Message Handler")
    try:
        from modules.whatsapp.message_handler import handle_message
        
        # Test message handling with dict format
        test_message = {
            "Body": "Welche Fahrzeuge habt ihr?",
            "From": "+43123456789",
            "MessageSid": "SM123456789"
        }
        
        print(f"📨 Testing with message: '{test_message['Body']}'")
        
        response = handle_message(test_message)
        
        assert isinstance(response, str), "Response should be a string"
        assert len(response) > 0, "Response should not be empty"
        
        print(f"✅ Message handling response: {response[:150]}...")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoint():
    """Test FastAPI endpoint"""
    print_header("Testing API Endpoint")
    try:
        import requests
        
        response = requests.post(
            "http://localhost:8000/ask",
            json={"text": "Welche Fahrzeuge habt ihr?"},
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "answer" in data, "Response should have 'answer' field"
        assert len(data["answer"]) > 0, "Answer should not be empty"
        
        print(f"✅ API Response: {data['answer'][:150]}...")
        return True
    except requests.exceptions.ConnectionError:
        print(f"⚠️  Server not running on localhost:8000")
        print(f"   Run: python -m uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  🧪 RAG PIPELINE COMPREHENSIVE TEST SUITE".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    tests = [
        ("Embeddings", test_embeddings),
        ("Vector Store", test_vector_store),
        ("Retriever", test_retriever),
        ("QA Chain", test_qa_chain),
        ("Message Handler", test_message_handler),
        ("API Endpoint", test_api_endpoint),
    ]
    
    results = {}
    for name, test_func in tests:
        results[name] = test_func()
    
    # Summary
    print_header("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is ready to deploy.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
