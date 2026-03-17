from modules.data_ingestion import scraper


def test_scrape_site():
    data = scraper.scrape_site("https://example.com")
    assert isinstance(data, list)
