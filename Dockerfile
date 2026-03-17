FROM python:3.11-slim

WORKDIR /app

# Abhängigkeiten installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App kopieren
COPY . .

# Port freigeben
EXPOSE 8000

# Starten
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]