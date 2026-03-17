import traceback
import requests
from bs4 import BeautifulSoup

URL = "https://www.royal-ecars.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Scraper/1.0)"}

def main():
    try:
        r = requests.get(URL, headers=HEADERS, timeout=15)
        print("status:", r.status_code, "len:", len(r.content))
        r.raise_for_status()

        soup = BeautifulSoup(r.content, "html.parser")
        texts = []
        for item in soup.find_all(["h1", "h2", "h3", "p"]):
            t = item.get_text(strip=True)
            if t and len(t) > 10:
                texts.append(t[:200])
        print(f"Found {len(texts)} text elements; showing up to 5:")
        for i, t in enumerate(texts[:5], 1):
            print(f"{i}. {t}")
    except Exception:
        print("ERROR:")
        traceback.print_exc()

if __name__ == "__main__":
    main()