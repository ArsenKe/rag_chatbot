"""Run one-off scraping job and store results."""
from modules.data_ingestion.scraper import scrape_site


def main():
    docs = scrape_site("https://royal-ecars.com")
    print(f"Scraped {len(docs)} documents")


if __name__ == '__main__':
    main()
