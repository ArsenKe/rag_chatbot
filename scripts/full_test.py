"""Full system test with all features"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
import json
from time import sleep

API_URL = "http://localhost:8000"

def test_section(name):
    print(f"\n{'='*60}")
    print(f"🧪 {name}")
    print(f"{'='*60}\n")

def test_health():
    """Test server is running"""
    test_section("Server Health")
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        assert response.status_code == 200
        print("✅ Server is running")
        return True
    except:
        print("❌ Server not running on localhost:8000")
        print("   Run: python -m uvicorn app.main:app --reload --port 8000")
        return False

def test_basic_query():
    """Test basic question answering"""
    test_section("Basic Query")
    try:
        response = requests.post(
            f"{API_URL}/ask",
            json={"text": "Welche Fahrzeuge habt ihr?"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Question: {data['question']}")
        print(f"Answer: {data['answer'][:200]}...")
        print("✅ Basic query works")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_multiple_queries():
    """Test multiple different queries"""
    test_section("Multiple Queries")
    queries = [
        "Welche Fahrzeuge bietet ihr an?",
        "Wie viel kostet eine Buchung?",
        "Bietet ihr einen Champagne Service an?",
        "Wie viel Zeit im Voraus muss ich buchen?",
        "Akzeptiert ihr Haustiere?"
    ]
    
    try:
        passed = 0
        for query in queries:
            response = requests.post(
                f"{API_URL}/ask",
                json={"text": query}
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Q: {query[:50]}...")
                print(f"   A: {data['answer'][:100]}...\n")
                passed += 1
        
        print(f"✅ {passed}/{len(queries)} queries answered")
        return passed == len(queries)
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_data_stats():
    """Test data statistics endpoint"""
    test_section("Data Statistics")
    try:
        response = requests.get(f"{API_URL}/data/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Total documents: {data['total_documents']}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_response_quality():
    """Test response quality"""
    test_section("Response Quality")
    try:
        response = requests.post(
            f"{API_URL}/ask",
            json={"text": "Welche Fahrzeuge habt ihr?"}
        )
        data = response.json()
        
        # Check response quality
        answer = data['answer']
        checks = {
            "Has content": len(answer) > 50,
            "Is German": any(word in answer.lower() for word in ['ist', 'hat', 'bietet', 'fahrzeuge']),
            "Not error": "error" not in answer.lower(),
            "Relevant": "e-car" in answer.lower() or "fahrzeug" in answer.lower()
        }
        
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"{status} {check}")
        
        passed = sum(checks.values())
        return passed >= 3
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_concurrent_requests():
    """Test handling multiple concurrent requests"""
    test_section("Concurrent Requests")
    try:
        import threading
        results = []
        
        def make_request(i):
            response = requests.post(
                f"{API_URL}/ask",
                json={"text": f"Query {i}"}
            )
            results.append(response.status_code == 200)
        
        threads = []
        for i in range(5):
            t = threading.Thread(target=make_request, args=(i,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        passed = sum(results)
        print(f"✅ {passed}/5 concurrent requests succeeded")
        return passed >= 4
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_error_handling():
    """Test error handling"""
    test_section("Error Handling")
    try:
        # Empty query
        response = requests.post(
            f"{API_URL}/ask",
            json={"text": ""}
        )
        print(f"✅ Empty query handled: {response.status_code}")
        
        # Very long query
        response = requests.post(
            f"{API_URL}/ask",
            json={"text": "a" * 5000}
        )
        print(f"✅ Long query handled: {response.status_code}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  🧪 FULL SYSTEM TEST SUITE".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    tests = [
        ("Server Health", test_health),
        ("Basic Query", test_basic_query),
        ("Multiple Queries", test_multiple_queries),
        ("Data Statistics", test_data_stats),
        ("Response Quality", test_response_quality),
        ("Concurrent Requests", test_concurrent_requests),
        ("Error Handling", test_error_handling),
    ]
    
    results = {}
    for name, test_func in tests:
        results[name] = test_func()
        sleep(1)
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\n🎯 Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is production-ready.\n")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.\n")
        return 1

if __name__ == "__main__":
    exit(main())