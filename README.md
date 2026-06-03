# AutoAggregator — MVP

Aggregatore di annunci auto usate da AutoScout24 e Subito.it.

## Prerequisiti

- Node.js 18+
- (Opzionale) PostgreSQL per future funzionalità di caching

## Setup

### Backend

```bash
cd backend
npm install
npx playwright install chromium
npm run dev
```

Il server parte su `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Il frontend parte su `http://localhost:3000`.

## Utilizzo

1. Apri `http://localhost:3000`
2. Inserisci marca (es. BMW), modello (es. Serie 3)
3. Opzionalmente inserisci una località e seleziona il raggio
4. Clicca "Cerca auto"
5. I risultati vengono recuperati in tempo reale (~10-20 secondi)
6. Clicca su una card per aprire l'annuncio originale

## API

```
GET /api/search?make=BMW&model=i5&location=Padova&radius=100&page=1
```

Risposta:
```json
{
  "results": [...],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

## Stack

- **Frontend**: Next.js 16, TailwindCSS
- **Backend**: Express, TypeScript
- **Scraping**: Playwright (Chromium)
- **ORM**: Prisma (schema definito, non usato nel flusso MVP)
- **Geocoding**: Nominatim (OpenStreetMap)
