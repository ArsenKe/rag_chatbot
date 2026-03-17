"""Web scraper for company information"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import time

class WebScraper:
    def __init__(self, delay: float = 1.0):
        """Initialize web scraper"""
        self.delay = delay
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def scrape_url(self, url: str) -> str:
        """Scrape content from URL"""
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return ""
    
    def scrape_urls(self, urls: List[str]) -> List[Dict]:
        """Scrape multiple URLs"""
        documents = []
        
        for url in urls:
            print(f"Scraping {url}...")
            content = self.scrape_url(url)
            
            if content:
                documents.append({
                    'id': url.replace('/', '_'),
                    'content': content,
                    'metadata': {
                        'source': url,
                        'type': 'web'
                    }
                })
            
            time.sleep(self.delay)
        
        return documents