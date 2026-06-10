# AutoVerse — Project Plan
### Car Intelligence & Ownership Platform | College Placement Project

---

## 1. What We Are Actually Building

A web platform where users can **search, compare, and calculate the true cost** of owning a car in India. Data source: Indian Car Market Dataset (MSSQL). No 3D models, no Google Maps, no historical pricing — those require data or APIs we don't have. Everything below is buildable with what we have.

---

## 2. Finalized Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + React Router + Axios |
| Backend | Python + FastAPI + SQLAlchemy + Pydantic |
| Database | MSSQL (SQL Server) |
| Charts | Recharts (lightweight, React-native) |
| Image Storage | Cloudinary (Phase 3 only) |
| Deployment | Render (backend) + Vercel (frontend) — both free |

**Removed from original AI spec:**
- React Three Fiber / Three.js — no 3D model data available
- Google Maps — showroom data not in dataset
- PostgreSQL → replaced with MSSQL (already decided)
- Price trend analysis — no historical pricing data

---

## 3. Features: In vs Out

### IN (buildable with dataset)
| Feature | Phase |
|---|---|
| Car search with filters (brand, fuel, body, price, seats, transmission) | 1 |
| Car detail page (all specs from dataset) | 1 |
| Car comparison tool (up to 3 cars side by side) | 2 |
| Car recommendation engine (budget + preference → ranked list) | 2 |
| Ownership cost calculator (fuel + insurance + maintenance + depreciation) | 2 |
| Depreciation calculator with graph | 3 |
| Admin panel (add/edit/delete cars) | 3 |
| Popularity dashboard (most viewed/compared cars) | 4 |

### OUT (data or API not available)
| Feature | Why Skipped |
|---|---|
| 360° / 3D car viewer | No GLB/GLTF models in dataset |
| Nearby showroom finder | No showroom data, Google Maps API cost |
| Price trend / historical analysis | Dataset has no historical pricing |
| Fuel Cost Simulator (separate) | Merged into Ownership Cost Calculator |
| Exact insurance quotes | Requires IRDAI API (not free) |

---

## 4. Phase-wise Roadmap

---

### PHASE 1 — Foundation ⭐ HIGHEST PRIORITY
**Goal:** A working, deployable app with real data. This alone is enough to show in an interview.
**Duration:** 2 weeks

#### 1A. Project Setup
- Initialize React + Vite + Tailwind frontend
- Initialize FastAPI backend with folder structure
- Connect FastAPI to MSSQL via SQLAlchemy
- Setup `.env` for DB connection string
- CORS configured between frontend and backend

#### 1B. Data Ingestion
- Download Indian Car Market Dataset CSV from Kaggle
- Inspect columns: `df.columns`, `df.shape`, `df.dtypes`
- Write `ingest.py` to clean and load CSV into MSSQL `cars` table
- Verify data in SSMS

#### 1C. Car Listing & Search
**Backend:**
- `GET /cars` — paginated list with query params: `brand`, `fuel_type`, `body_type`, `transmission`, `min_price`, `max_price`, `seats`
- `GET /cars/{id}` — full car detail
- `GET /cars/brands` — distinct brand list for dropdown
- `GET /cars/filters/options` — all dropdown values (fuel types, body types, etc.)

**Frontend:**
- `/` — Home page with search bar + featured cars
- `/cars` — Car listing page with sidebar filters + cards grid
- `/cars/:id` — Car detail page with full specs table

#### Phase 1 Deliverable
A live website where anyone can browse Indian cars, filter them, and view full specs.

---

### PHASE 2 — Core Value Features ⭐ HIGH PRIORITY
**Goal:** Features that make AutoVerse different from a plain listing site.
**Duration:** 2 weeks

#### 2A. Car Comparison Tool
- User selects up to 3 cars from any listing/detail page
- Selection stored in `localStorage`
- `/compare` page renders side-by-side table
- Highlight better value in green, worse in red (e.g., higher mileage = green)

**Backend:**
- `GET /cars/compare?ids=1,2,3` — returns full specs for given IDs

**Frontend:**
- "Add to Compare" button on every car card (max 3)
- `/compare` — full comparison table page

#### 2B. Car Recommendation Engine
User inputs: budget, fuel preference, body type, seating need, usage (city/highway)

**Scoring logic (backend):**
```
score = 0
if price <= budget:           score += 40
if fuel_type == preference:   score += 20
if body_type == preference:   score += 15
if seats >= required_seats:   score += 15
if mileage >= 15:             score += 10  # good fuel economy
```
Return top 5 cars sorted by score descending.

**Backend:**
- `POST /cars/recommend` — accepts preferences, returns scored list

**Frontend:**
- `/recommend` — multi-step form (budget → fuel → body → seats → results)

#### 2C. Ownership Cost Calculator
User inputs: years of ownership, annual km driven
System uses car's mileage and price from DB.

**Calculation formulas:**
```
fuel_price_per_liter = 100  # INR, configurable
annual_fuel_cost = (annual_km / car.mileage) × fuel_price_per_liter
annual_insurance = car.price × 0.025          # 2.5% of ex-showroom
annual_maintenance = 10000                     # flat ₹10k/year estimate
depreciation_year1 = car.price × 0.15         # 15% first year
depreciation_subsequent = car.price × 0.10    # 10% each following year

total_ownership_cost = (annual_fuel + annual_insurance + annual_maintenance) × years
                       + total_depreciation
```

**Backend:**
- `POST /calculators/ownership` — accepts car_id + years + annual_km

**Frontend:**
- Calculator widget on every car detail page
- Results: total cost, cost/year, cost/km — displayed as stat cards

#### Phase 2 Deliverable
Users can get personalized recommendations, compare cars head-to-head, and calculate real ownership cost. This is the resume centrepiece.

---

### PHASE 3 — Depth & Admin ⭐ MEDIUM PRIORITY
**Goal:** Depreciation chart and admin control — makes the project feel complete.
**Duration:** 1.5 weeks

#### 3A. Depreciation Calculator (with chart)
Based on standard Indian market depreciation rates:
```
Year 0: 100% (purchase)
Year 1: 85%  (-15%)
Year 2: 75%  (-10%)
Year 3: 65%
Year 5: 50%
Year 8: 35%
```
Display as a line chart (Recharts). Show estimated resale value per year.

**Backend:**
- `GET /calculators/depreciation/{car_id}` — returns year-by-year value

**Frontend:**
- Depreciation section on car detail page with Recharts LineChart

#### 3B. Admin Panel
Separate section at `/admin`.

**Pages:**
- `/admin/cars` — table of all cars with Edit / Delete buttons
- `/admin/cars/new` — form to add a new car (all spec fields)
- `/admin/cars/:id/edit` — edit existing car

**Backend:**
- `GET    /admin/cars` — all cars (including inactive)
- `POST   /admin/cars` — add new car
- `PUT    /admin/cars/{id}` — edit car
- `DELETE /admin/cars/{id}` — delete car

#### Phase 3 Deliverable
Complete platform with admin control over data. Project can be demonstrated end-to-end without any login flow.

---

### PHASE 4 — Polish & Deployment ⭐ LOWER PRIORITY
**Goal:** Make it look good, deploy it live, add a shareable URL to your resume.
**Duration:** 1 week

#### 4A. Popularity Dashboard
Track views per car (increment on each `GET /cars/:id` call). Display:
- Most viewed cars (this week)
- Most compared cars
- Top brands by views
- Simple bar charts (Recharts)

#### 4B. Image Upload (Cloudinary)
- Admin can upload car images
- Cloudinary URL stored in DB
- Car detail page shows image gallery

#### 4C. Deployment
- **Frontend:** Vercel (free) — `npm run build` → deploy
- **Backend:** Render (free) — Dockerfile or Python runtime
- **Database:** Keep MSSQL local or use Azure SQL free tier (250GB free)
- Add environment variables on both platforms

#### 4D. Final UI Polish
- Dark mode toggle
- Loading skeletons instead of spinners
- Empty states (no results found)
- 404 page
- Mobile responsiveness audit

---

## 5. Database Schema (MSSQL)

```sql
-- Brands
CREATE TABLE brands (
    id      INT IDENTITY(1,1) PRIMARY KEY,
    name    NVARCHAR(100) NOT NULL UNIQUE,
    logo_url NVARCHAR(500)
);

-- Cars
CREATE TABLE cars (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    brand_id        INT REFERENCES brands(id),
    model           NVARCHAR(100) NOT NULL,
    variant         NVARCHAR(200),
    body_type       NVARCHAR(50),       -- SUV, Sedan, Hatchback, MUV
    fuel_type       NVARCHAR(50),       -- Petrol, Diesel, CNG, Electric
    transmission    NVARCHAR(50),       -- Manual, Automatic
    price           DECIMAL(12,2),      -- ex-showroom INR
    mileage         DECIMAL(6,2),       -- kmpl
    engine_cc       INT,
    power_bhp       DECIMAL(6,2),
    torque_nm       DECIMAL(6,2),
    seats           INT,
    safety_rating   DECIMAL(3,1),       -- out of 5
    description     NVARCHAR(MAX),
    view_count      INT DEFAULT 0,
    compare_count   INT DEFAULT 0,
    is_active       BIT DEFAULT 1,
    created_at      DATETIME DEFAULT GETDATE()
);

-- Car Images
CREATE TABLE car_images (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    car_id      INT REFERENCES cars(id) ON DELETE CASCADE,
    url         NVARCHAR(500),
    is_primary  BIT DEFAULT 0
);

```

---

## 6. API Endpoints

### Cars
```
GET    /cars                        ?brand, fuel_type, body_type, transmission,
                                     min_price, max_price, seats, sort, page, limit
GET    /cars/{id}                   also increments view_count
GET    /cars/brands                 distinct brand list for dropdowns
GET    /cars/filters/options        all filter dropdown values
GET    /cars/compare?ids=1,2,3      full specs for up to 3 car IDs
POST   /cars/recommend              body: {budget, fuel_type, body_type, seats}
```

### Calculators
```
POST   /calculators/ownership       body: {car_id, years, annual_km, fuel_price}
GET    /calculators/depreciation/{car_id}
```

### Admin
```
GET    /admin/cars                  all cars including inactive
POST   /admin/cars                  add new car
PUT    /admin/cars/{id}             edit car
DELETE /admin/cars/{id}             delete car
GET    /admin/analytics             view_count, compare_count, top cars
```

> No user-state endpoints — every API call is stateless and data-only.

---

## 7. Folder Structure

```
autoverse/
├── frontend/                       # React + Vite
│   ├── public/
│   ├── src/
│   │   ├── api/                    # Axios instance + API functions
│   │   │   ├── axios.js
│   │   │   ├── cars.js
│   │   │   └── calculators.js
│   │   ├── components/             # Reusable UI pieces
│   │   │   ├── CarCard.jsx
│   │   │   ├── FilterSidebar.jsx
│   │   │   ├── SpecTable.jsx
│   │   │   ├── DepreciationChart.jsx
│   │   │   ├── OwnershipResult.jsx
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── CarListing.jsx
│   │   │   ├── CarDetail.jsx
│   │   │   ├── Compare.jsx
│   │   │   ├── Recommend.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       └── ManageCars.jsx
│   │   ├── context/
│   │   │   └── CompareContext.jsx  # selected cars for comparison (up to 3)
│   │   ├── hooks/
│   │   │   └── useCars.js
│   │   ├── utils/
│   │   │   └── formatCurrency.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                        # FastAPI
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router registration
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── car.py
│   │   │   └── brand.py
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   └── car.py
│   │   ├── routers/                # FastAPI route handlers
│   │   │   ├── cars.py
│   │   │   ├── calculators.py
│   │   │   └── admin.py
│   │   └── services/               # Business logic
│   │       ├── recommendation.py
│   │       ├── ownership_cost.py
│   │       └── depreciation.py
│   ├── ingest.py                   # CSV → MSSQL one-time script
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

## 8. Sprint Plan

| Sprint | Duration | What Gets Built |
|---|---|---|
| **Sprint 1** | Week 1 | Project setup, DB schema, `ingest.py`, car listing API, car listing + detail pages |
| **Sprint 2** | Week 2 | Comparison tool, recommendation engine |
| **Sprint 3** | Week 3 | Ownership cost calculator, depreciation chart |
| **Sprint 4** | Week 4 | Admin panel (car CRUD), popularity dashboard |
| **Sprint 5** | Week 5 | UI polish, mobile responsiveness, deployment (Vercel + Render) |

---

## 9. What NOT to Build (Save Time)

| Skip | Reason |
|---|---|
| 3D car viewer | No 3D model files exist for Indian cars freely |
| Showroom finder | No showroom dataset; Google Maps API has cost |
| Payment integration | Not relevant to this product |
| Separate Fuel Cost Simulator page | Already covered in Ownership Cost Calculator |

---

## 10. Resume Description

```
AutoVerse – Car Intelligence & Ownership Platform
Tech: React, Vite, FastAPI, MSSQL, Tailwind CSS, Recharts

Built a full-stack car discovery platform serving Indian market data for 
500+ vehicles. Features include:
- Multi-filter car search with pagination (brand, fuel, body, price, seats)
- Side-by-side comparison of up to 3 vehicles across 15+ specifications
- Scoring-based recommendation engine using budget and user preferences
- Ownership cost calculator projecting 5-year fuel, insurance, and 
  maintenance costs
- Depreciation curve visualisation using standard Indian market rate modelling
- Admin panel for full car data CRUD management
- RESTful API with 15+ endpoints, Pydantic validation, and SQLAlchemy ORM
```

---

## 11. Key Principles to Follow

- **No over-engineering.** No microservices, no Redis, no Celery. FastAPI + MSSQL is enough.
- **Working > Perfect.** Phase 1 live is better than Phase 4 half-done.
- **Real data only.** Every number shown on screen comes from the actual dataset — no fake/mock data.
- **Mobile responsive from day one.** Tailwind makes this easy; don't leave it for the end.
- **`.env` for everything.** No hardcoded DB URLs, no hardcoded secrets, ever.
