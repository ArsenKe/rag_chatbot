"""modules/data_ingestion/scraper.py
Example: RoyalECarsScraper implementation using requests + BeautifulSoup
"""

import requests
from bs4 import BeautifulSoup
import json
from typing import List, Dict


class RoyalECarsScraper:
    def __init__(self):
        self.base_urls = [
            "https://www.royal-ecars.com",
            "https://www.royal-ecars.com/de",
            "https://www.royal-ecars.com/book-online",
        ]

    def scrape_all(self) -> List[Dict]:
        """Scrape alle relevanten Seiten"""
        all_data = []

        for url in self.base_urls:
            try:
                print(f"Scraping: {url}")
                response = requests.get(url, timeout=10)
                soup = BeautifulSoup(response.content, "html.parser")

                # Extrahiere strukturierte Daten (anpassen je nach Seite)
                page_data = self._extract_page_data(url, soup)
                all_data.extend(page_data)

            except Exception as e:
                print(f"Fehler beim Scrapen von {url}: {e}")

        return all_data

    def _extract_page_data(self, url: str, soup: BeautifulSoup) -> List[Dict]:
        """Extrahiere strukturierte Informationen von einer Seite"""
        data = []

        # Beispiel: Extrahiere Tour-Informationen
        tour_elements = soup.find_all("div", class_="tour-item")  # CSS-Klasse anpassen!

        for tour in tour_elements:
            tour_data = {
                "source": url,
                "content": tour.get_text(strip=True),
                "type": "tour_description",
                "metadata": {
                    "scraped_at": "2024-01-01",  # Dynamisch setzen
                    "url": url,
                },
            }
            data.append(tour_data)

        return data


# Export-Funktion für Script
def scrape_and_save(output_path: str = "data/scraped_tours.json"):
    scraper = RoyalECarsScraper()
    data = scraper.scrape_all()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(data)} Einträge gespeichert nach {output_path}")
    return data
