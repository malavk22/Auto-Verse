# AutoVerse

A full-stack web platform to browse, filter, and compare 10,000+ cars in the Indian market. Includes a preference-based recommendation engine that ranks cars by budget, fuel type, and mileage, along with ownership cost projections.

## Features

- **Multi-filter car search** — filter by brand, fuel type, body type, transmission, price range, and seating capacity
- **Detailed car pages** — full specifications including engine, mileage, safety rating, and more
- **Recommendation engine** — scoring-based system that ranks cars by user preferences (budget, fuel, body type, seats, mileage)
- **Ownership cost calculator** — projects fuel, insurance, maintenance, and depreciation costs over time
- **Responsive UI** — built with React and Tailwind CSS for mobile and desktop
- **RESTful API** — FastAPI backend with Pydantic validation and SQLAlchemy ORM

## Tech Stack

**Frontend**
- React + Vite
- React Router
- Tailwind CSS
- Axios

**Backend**
- Python 3.11
- FastAPI
- SQLAlchemy
- Pydantic

**Database**
- Microsoft SQL Server

## Project Structure

```
Auto-Verse/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── database.py        # SQLAlchemy engine and session
│   │   ├── models/            # ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API route handlers
│   │   └── services/          # Business logic (recommendation, cost, depreciation)
│   ├── ingest.py              # CSV → SQL Server ingestion script
│   ├── car_dataset_india.csv  # Source dataset
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/               # Axios setup and API functions
    │   ├── components/        # Reusable UI components
    │   ├── pages/             # Route-level pages
    │   └── utils/             # Helpers
    ├── package.json
    └── vite.config.js
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Microsoft SQL Server (local or remote)
- ODBC Driver 17 for SQL Server

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate       # Windows
   source venv/bin/activate    # macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `DATABASE_URL`.

5. Ingest the dataset into SQL Server:
   ```bash
   python ingest.py
   ```

6. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cars` | Paginated, filtered car listing |
| GET | `/cars/{id}` | Full car details |
| GET | `/cars/brands` | Distinct brand list |
| GET | `/cars/filters/options` | All filter dropdown values |
| GET | `/cars/compare?ids=1,2,3` | Side-by-side comparison |
| POST | `/cars/recommend` | Ranked recommendations from preferences |
| POST | `/calculators/ownership` | Ownership cost projection |
| GET | `/calculators/depreciation/{car_id}` | Year-by-year depreciation |

Full interactive API docs available at `/docs` when the backend is running.

## Dataset

Built on the Indian Car Market Dataset containing 10,000+ vehicles across major Indian brands. Includes specs for engine, mileage, fuel type, transmission, body type, seating, and pricing.

## Author

**Karelia Malav H**
