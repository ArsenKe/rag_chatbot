#!/usr/bin/env python
"""
Setup and initialization script for Royal E-Cars Chatbot
Run this after installing dependencies to initialize the system
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


def check_env_file():
    """Check if .env file exists"""
    env_file = project_root / ".env"
    env_example = project_root / ".env.example"
    
    print("\n" + "="*60)
    print("📋 Environment Configuration Check")
    print("="*60)
    
    if env_file.exists():
        print("✅ .env file found")
        return True
    else:
        print("❌ .env file NOT found")
        if env_example.exists():
            print(f"📝 Copy {env_example} to .env and fill in credentials")
        return False


def check_imports():
    """Check if all required packages are installed"""
    print("\n" + "="*60)
    print("📦 Dependencies Check")
    print("="*60)
    
    required_packages = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('openai', 'OpenAI'),
        ('chromadb', 'ChromaDB'),
        ('twilio', 'Twilio'),
        ('pydantic', 'Pydantic'),
        ('dotenv', 'python-dotenv'),
        ('bs4', 'BeautifulSoup4'),
        ('requests', 'Requests'),
    ]
    
    all_installed = True
    for package, name in required_packages:
        try:
            __import__(package)
            print(f"✅ {name}")
        except ImportError:
            print(f"❌ {name} - NOT INSTALLED")
            all_installed = False
    
    return all_installed


def init_vector_db():
    """Initialize and seed the vector database"""
    print("\n" + "="*60)
    print("🗄️  Vector Database Initialization")
    print("="*60)
    
    try:
        from database.seed_database import seed
        seed()
        print("✅ Vector database seeded successfully")
        return True
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        return False


def test_config():
    """Test configuration loading"""
    print("\n" + "="*60)
    print("⚙️  Configuration Test")
    print("="*60)
    
    try:
        from app.core.config import settings
        
        print(f"✅ Environment: {settings.ENVIRONMENT}")
        print(f"✅ Chroma Dir: {settings.CHROMA_PERSIST_DIR}")
        print(f"✅ Embedding Model: {settings.EMBEDDING_MODEL}")
        print(f"✅ OpenAI Model: {settings.OPENAI_MODEL}")
        
        # Check credentials
        if settings.OPENAI_API_KEY:
            print(f"✅ OpenAI API Key configured")
        else:
            print(f"⚠️  OpenAI API Key NOT configured")
        
        if settings.TWILIO_ACCOUNT_SID:
            print(f"✅ Twilio Account SID configured")
        else:
            print(f"⚠️  Twilio Account SID NOT configured")
        
        return True
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        return False


def test_modules():
    """Test that all modules can be imported"""
    print("\n" + "="*60)
    print("🧪 Module Import Tests")
    print("="*60)
    
    modules_to_test = [
        ('app.main', 'FastAPI App'),
        ('modules.data_ingestion.scraper', 'Web Scraper'),
        ('modules.data_ingestion.embeddings', 'Embeddings'),
        ('modules.rag.vector_store', 'Vector Store'),
        ('modules.rag.retriever', 'Retriever'),
        ('modules.rag.qa_chain', 'QA Chain'),
        ('modules.whatsapp.message_handler', 'Message Handler'),
        ('modules.whatsapp.twilio_client', 'Twilio Client'),
    ]
    
    all_imported = True
    for module, name in modules_to_test:
        try:
            __import__(module)
            print(f"✅ {name}")
        except Exception as e:
            print(f"❌ {name} - {str(e)[:50]}")
            all_imported = False
    
    return all_imported


def main():
    """Run all initialization checks"""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "   🚗 Royal E-Cars Chatbot - Initialization".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    checks = [
        ("Environment File", check_env_file),
        ("Dependencies", check_imports),
        ("Configuration", test_config),
        ("Modules", test_modules),
    ]
    
    results = {}
    for check_name, check_func in checks:
        try:
            results[check_name] = check_func()
        except Exception as e:
            print(f"\n❌ Error in {check_name}: {e}")
            results[check_name] = False
    
    # Database initialization is optional
    print("\n" + "="*60)
    print("Optional: Initialize Vector Database")
    print("="*60)
    try:
        init_vector_db()
    except Exception as e:
        print(f"⚠️  Database initialization skipped: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("📊 Initialization Summary")
    print("="*60)
    
    for check_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check_name}")
    
    all_pass = all(results.values())
    
    if all_pass:
        print("\n✨ All checks passed! System is ready.")
        print("\n🚀 To start the server, run:")
        print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("\n⚠️  Some checks failed. Please review the errors above.")
        print("   Make sure to:")
        print("   1. Copy .env.example to .env")
        print("   2. Fill in your credentials (OpenAI, Twilio)")
        print("   3. Install all dependencies: pip install -r requirements.txt")
    
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
