"""Seed the Chroma vector DB with initial documents"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from modules.rag.vector_store import VectorStore
from app.core.config import Settings
from datetime import datetime


SAMPLE_DOCUMENTS = [
    {
        "id": "doc_1",
        "content": """Royal E-Cars - Luxus Elektromobilität in Wien
        
Willkommen bei Royal E-Cars! Wir bieten exklusive Touren und Transfers mit Luxus-Elektrofahrzeugen in Wien.

Unsere Fahrzeugflotte:
- Tesla Model S (bis zu 4 Passagiere)
- BMW i7 (bis zu 5 Passagiere)
- Audi e-tron (bis zu 5 Passagiere)

Alle Fahrzeuge sind mit Premium-Innenausstattung, Klimaanlage und Entertainment-Systemen ausgestattet.
""",
        "metadata": {
            "source": "https://www.royal-ecars.com",
            "category": "fleet_info",
            "language": "de",
            "date": datetime.now().isoformat()
        }
    },
    {
        "id": "doc_2",
        "content": """Buchungsoptionen und Verfügbarkeit

Wir bieten flexible Buchungsmöglichkeiten:

Stadttouren:
- Klassische Wien Tour (2 Stunden): €150 pro Person
- Gourmet Tour mit Restaurantbesuchen: €280 pro Person
- Geschichte Wiens Tour: €160 pro Person

Flughafentransfer:
- Vienna International Airport zum Zentrum: €80-120
- Verfügbar 24/7

Verfügbarkeit:
- Montag - Freitag: 8:00 - 23:00 Uhr
- Samstag - Sonntag: 10:00 - 22:00 Uhr
- Buchungen mindestens 2 Stunden voraus

Kontakt: booking@royal-ecars.com oder +43 1 234 5678
""",
        "metadata": {
            "source": "https://www.royal-ecars.com/book-online",
            "category": "booking_info",
            "language": "de",
            "date": datetime.now().isoformat()
        }
    },
    {
        "id": "doc_3",
        "content": """Besonderheiten und Premium-Services

Royal E-Cars bietet einzigartige Services:

Champagne & Caviar Service:
- Für besondere Anlässe verfügbar
- Edler Champagne, Kaviar, Schokoladen
- Aufpreis: €50 zusätzlich

Musikwunsch-Service:
- Sie können eine Playlist zusammenstellen
- Premium Audio-System (Burmester/Bang & Olufsen)

Privatsphäre und Komfort:
- Getönte Fenster für totale Privatsphäre
- Massagefunktion in den Sitzen
- USB-C Ladeanschlüsse
- Minibar mit Getränken

Nachhaltig reisen:
- 100% Elektrische Fahrzeuge
- Null CO2-Emissionen
- Umweltfreundliche Reinigungsmittel

Alle Services sind auf Wunsch buchbar!
""",
        "metadata": {
            "source": "https://www.royal-ecars.com",
            "category": "premium_services",
            "language": "de",
            "date": datetime.now().isoformat()
        }
    },
    {
        "id": "doc_4",
        "content": """Häufig gestellte Fragen (FAQs)

F: Wie lange im Voraus muss ich buchen?
A: Idealer Weise 2-24 Stunden. Buchungen innerhalb 2 Stunden können zu Verfügbarkeitsproblemen führen.

F: Kann ich den Fahrer bitten, Stops einzuplanen?
A: Ja! Sie können bis zu 5 Zwischenstopps auf jeder Tour einplanen.

F: Gibt es Rabatte für Gruppenreservierungen?
A: Ja, ab 3 Fahrzeugen gibt es 10% Rabatt.

F: Sind Haustiere erlaubt?
A: Haustiere in Transportboxen sind willkommen. Bitte bei Buchung angeben.

F: Was ist bei Verspätungen des Flugzeugs?
A: Unser Service wartet kostenfrei bis zu 2 Stunden am Flughafen.

F: Kann ich den Fahrer wechseln?
A: Ja, vor der Fahrt können Sie einen anderen Fahrer anfordern.

F: Bietet ihr Services auf Englisch an?
A: Ja, alle Fahrer sprechen Englisch. Weitere Sprachen auf Anfrage.
""",
        "metadata": {
            "source": "https://www.royal-ecars.com",
            "category": "faqs",
            "language": "de",
            "date": datetime.now().isoformat()
        }
    }
]


def seed():
    """Seed the database with sample documents"""
    print("🌱 Starte Datenbank-Seeding...")
    
    try:
        settings = Settings()
        vector_store = VectorStore(settings)
        
        # Add documents
        vector_store.add_documents(SAMPLE_DOCUMENTS)
        
        # Print info
        info = vector_store.get_collection_info()
        print(f"✅ {info['document_count']} Dokumente in Vector DB")
        print("✨ Datenbank-Seeding abgeschlossen!")
        
    except Exception as e:
        print(f"❌ Fehler beim Seeding: {e}")
        raise


if __name__ == '__main__':
    seed()
