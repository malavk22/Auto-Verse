# AutoVerse — Ownership Calculator & Depreciation Logic

---

## Ownership Cost Calculator

**Inputs:** ex-showroom price, years owned, annual km driven, fuel price per litre, mileage (kmpl), annual service cost

### Annual Fuel Cost
```
Annual Fuel Cost = (Annual KM ÷ Mileage) × Fuel Price per Litre

Example: (15,000 ÷ 20 kmpl) × ₹103 = 750 litres × ₹103 = ₹77,250/year
```

### Annual Insurance
```
Annual Insurance = Ex-showroom Price × 2.5%

Example: ₹10,00,000 × 0.025 = ₹25,000/year
```
Approximates the IDV-based comprehensive insurance premium used in India.

### Annual Maintenance
```
Annual Maintenance = service_cost column from DB (already per year)

Example: ₹12,000/year
```

### Depreciation (used inside ownership cost)
```
Year 1 loss  = Price × 15%
Year 2+ loss = Price × 10% per year

Total Depreciation (5 years) = (Price × 15%) + (Price × 10% × 4)
Example: ₹1,50,000 + ₹4,00,000 = ₹5,50,000
```

### Total Ownership Cost
```
Total = (Annual Fuel + Annual Insurance + Annual Maintenance) × Years
      + Total Depreciation

Cost per Year = Total ÷ Years
Cost per KM   = Total ÷ (Annual KM × Years)
```

---

## Depreciation Schedule (IRDAI-aligned)

Follows the Insurance Regulatory and Development Authority of India schedule —
the same table used to calculate a car's Insured Declared Value (IDV) each year.

| Year | Value Retained |
|------|----------------|
| 0 (purchase) | 100% |
| 1 | 85% |
| 2 | 75% |
| 3 | 65% |
| 4 | 55% |
| 5 | 50% |
| 6 | 45% |
| 7 | 40% |
| 8 | 35% |

```
Market Value at Year N = Purchase Price × Retained %

Example: ₹10,00,000 car at Year 3
= ₹10,00,000 × 65% = ₹6,50,000
```

The value drops steeply in year 1 (15% loss) because cars lose the most value
the moment they leave the showroom. After year 5 it flattens — older cars
depreciate more slowly.

---

## Full Example — Honda City ₹12,00,000 | 5 years | 15,000 km/year | Petrol ₹103

| Component | Annual | Over 5 Years |
|---|---|---|
| Fuel (15,000 ÷ 20 × ₹103) | ₹77,250 | ₹3,86,250 |
| Insurance (₹12L × 2.5%) | ₹30,000 | ₹1,50,000 |
| Maintenance | ₹12,000 | ₹60,000 |
| Depreciation (15% + 10%×4) | — | ₹6,60,000 |
| **Total Ownership Cost** | | **₹12,56,250** |
| Cost per year | | **₹2,51,250** |
| Cost per km | | **₹1.67/km** |

---

## Condition-Based Valuation

Standard IRDAI depreciation gives a base market value assuming a car in average condition.
Real-world resale value deviates based on physical condition, accident history, ownership count,
and service record. The condition layer adjusts the IRDAI base value to reflect this.

### Reference — how existing platforms handle it

| Platform | Approach |
|---|---|
| Cars24 / Spinny | Physical inspection scoring 5 parameters (body, engine, interior, tyres, electrical) — each rated Good / Average / Poor, weighted average → condition grade |
| CarDekho / CarWale | 4-level condition picker + accident flag + owner count → percentage adjustment on base price |
| OLX Autos | Condition level + accident flag + service records → fixed percentage band applied to base price |

---

### Layer 1 — Condition Level (5 cards)

User selects one condition that best describes the car. Applied as a multiplier on the IRDAI market value.

| Condition | Description | Multiplier |
|---|---|---|
| Excellent | No dents or scratches, full service history, single owner, like new | ×1.05 |
| Good | Minor surface scratches, regular maintenance, well kept | ×1.00 (IRDAI as-is) |
| Fair | Visible wear, partial service history, minor dents | ×0.85 |
| Poor | Major dents / rust, skipped services, poor upkeep | ×0.70 |
| Damaged | Accident history or structural damage | ×0.50 |

---

### Layer 2 — Condition Flags (checkboxes, additive deductions)

Applied on top of the Layer 1 multiplier.

| Flag | Deduction |
|---|---|
| Accident history | −15% |
| More than 1 previous owner | −5% |
| No service records available | −8% |

---

### Formula

```
Adjusted Value = IRDAI Base Value
              × Condition Multiplier        (Layer 1)
              × (1 − Accident Deduction)    (Layer 2, if checked)
              × (1 − Owner Deduction)       (Layer 2, if checked)
              × (1 − Service Deduction)     (Layer 2, if checked)

Example:
  IRDAI Base Value at Year 3  = ₹6,50,000  (₹10L car × 65%)
  Condition: Fair             → × 0.85
  Accident history checked    → × 0.85
  Adjusted Value              = ₹6,50,000 × 0.85 × 0.85
                              = ₹4,69,625
```

---

### UI Plan

- Add "Car Condition" as Step 3 on the calculator page, between "Set Your Usage" and the Calculate button
- Layer 1: 5 visual cards in a row — icon + label + short description, single select
- Layer 2: 3 checkboxes below the cards
- Depreciation table: show two columns — **Standard Value** (IRDAI) and **Adjusted Value** (after condition)
- Highlight the difference between the two so users see the cost of poor condition

---

## Dynamic Fuel Price Fetching

Currently fuel prices are static defaults (Petrol ₹103, Diesel ₹90, CNG ₹85, EV ₹8/unit).
These need to be replaced with live prices since Indian fuel prices change daily at 6 AM and vary by city.

### Why static values are a problem

- Petrol/Diesel prices are revised daily by OMCs (IOCL, BPCL, HPCL)
- Prices differ city to city — Mumbai petrol ≠ Delhi petrol by ₹5–10
- A user in Chennai calculating ownership cost gets wrong figures if defaults are stale

### Source options

| Option | How | Reliability |
|---|---|---|
| goodreturns.in | Scrape the city-wise price table | Fragile — breaks if site changes HTML |
| mypetrolprice.com | Unofficial JSON endpoint, city-wise | Moderate — no auth needed |
| RapidAPI — "Fuel Prices in India" | Paid API, structured JSON, city + fuel type | Most reliable, costs money |
| Government data.gov.in | Official but updated monthly | Not suitable for daily use |

**Recommended:** mypetrolprice.com or RapidAPI endpoint fetched from the backend.
Fall back to hardcoded defaults if the fetch fails.

### Key decisions

- Backend fetches and caches prices per city for 1 hour — prices only change once a day
- Frontend pre-fills the fuel price input on page load; user can still override manually
- Add a city dropdown (10 major cities: Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Jaipur, Surat) — changing city re-fetches prices
- Show a badge under the fuel price input: `Live · Mumbai · Updated 6:00 AM` or `Using default` when API fails
- EV electricity tariff has no live API — keep ₹8/unit as a fixed default with a note

---

## Status Bar Input Boxes

Currently the Years and Annual Distance status bars are slider-only.
Users need to be able to type exact values, including decimals.

### Why slider-only is limiting

- Annual KM slider steps in 1,000 — cannot enter 12,500 km precisely
- Users who read their odometer want to type the exact number
- Years slider is integer-only — cannot calculate for 3.5 years

### Design

The current value pill next to the label becomes an editable number input.
Slider and input stay in sync — changing either one updates the other.
On blur the value is clamped to the allowed range.

| Field | Min | Max | Decimals |
|---|---|---|---|
| Years of Ownership | 1 | 10 | Yes (e.g. 3.5) |
| Annual Distance (km) | 5,000 | 50,000 | Yes (e.g. 12,500.5) |
| Fuel Price | 1 | 200 | Yes — already editable, no change needed |

---

## Source Files

| Logic | File |
|---|---|
| Ownership cost calculation | `backend/app/services/ownership_cost.py` |
| Depreciation schedule | `backend/app/services/depreciation.py` |
| API endpoints | `backend/app/routers/calculators.py` |
