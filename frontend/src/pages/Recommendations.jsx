import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendations } from '../api/recommendations'
import { getFilterOptions } from '../api/cars'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'
import FUEL_COLORS from '../utils/fuelColors'

const FUEL_OPTIONS = ['Petrol', 'Diesel', 'CNG', 'Electric']
const SEAT_OPTIONS = [4, 5, 6, 7]
const TRANSMISSION_OPTIONS = ['Manual', 'Automatic']
const PRIORITY_OPTIONS = [
  { value: 'efficiency', label: 'Fuel Efficiency', icon: 'fuel' },
  { value: 'low_maintenance', label: 'Low Maintenance', icon: 'sliders' },
]
const USE_CASE_OPTIONS = [
  { value: 'city', label: 'City Commute', icon: 'building' },
  { value: 'highway', label: 'Highway', icon: 'road' },
  { value: 'family', label: 'Family Car', icon: 'users' },
  { value: 'first_car', label: 'First Car', icon: 'flag' },
]
const YEAR_OPTIONS = [
  { value: '2020', label: '2020 & newer', icon: 'calendar' },
  { value: '2022', label: '2022 & newer', icon: 'star' },
  { value: '2024', label: '2024 & newer', icon: 'bolt' },
]
const BODY_TYPE_OPTIONS = [
  { value: 'Hatchback', label: 'Hatchback', icon: 'car' },
  { value: 'Sedan', label: 'Sedan', icon: 'car' },
  { value: 'SUV', label: 'SUV', icon: 'expand' },
  { value: 'MUV', label: 'MUV', icon: 'users' },
]

// Fallback bounds used only until the real price range loads from the API
// (see priceRange state below) - kept wide so the slider never feels wrong
// while loading, but the live min/max always wins once fetched.
const FALLBACK_BUDGET_RANGE = { min: 300000, max: 15000000 }

// Same base bg/text pairing as the shared FUEL_COLORS map, plus a matching
// border - this page is the only place that outlines the fuel badge.
const FUEL_BORDERS = {
  Petrol: 'border-orange-200',
  Diesel: 'border-blue-200',
  CNG: 'border-teal-200',
  Electric: 'border-green-200',
}
const fuelBadgeClass = (fuel) =>
  `${FUEL_COLORS[fuel] ?? 'bg-gray-100 text-gray-600'} ${FUEL_BORDERS[fuel] ?? 'border-gray-200'}`

const SCORE_TIERS = [
  { min: 90, label: 'Perfect Match',  bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-500' },
  { min: 70, label: 'Great Match',    bg: 'bg-blue-100',   text: 'text-blue-700',   bar: 'bg-blue-500'  },
  { min: 50, label: 'Good Match',     bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500'},
  { min:  0, label: 'Possible Match', bg: 'bg-gray-100',   text: 'text-gray-600',   bar: 'bg-gray-400'  },
]

function scoreTier(score) {
  return SCORE_TIERS.find(t => score >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1]
}

function ChipGroup({ label, options, selected, onToggle, multi = false }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const val = typeof opt === 'object' ? opt.value : opt
          const active = multi ? selected.includes(val) : selected === val
          return (
            <button
              key={val}
              type="button"
              onClick={() => onToggle(val)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white border-border text-gray-600 hover:border-primary/60 hover:text-primary'
              }`}
            >
              {typeof opt === 'object' && opt.icon && <Icon name={opt.icon} className="w-4 h-4" />}
              {typeof opt === 'object' ? opt.label : opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PriceAndScore({ car, tier, align = 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="font-display font-bold text-primary text-base">{formatLakhOrCrore(car.price)}</p>
      {car.mileage && <p className="text-xs text-muted mt-0.5">{car.mileage} km/l</p>}
      <span className={`mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${tier.bg} ${tier.text}`}>
        {tier.label}
      </span>
    </div>
  )
}

function ResultCard({ item, rank }) {
  const { car, score, reasons } = item
  const tier = scoreTier(score)
  // True ceiling of score_car() in app/services/recommendation.py: 40 (budget)
  // + 20 (fuel) + 15 (seats) + 10 (mileage baseline) + 15 (service baseline)
  // + 10 (transmission) + 10 (priority) + 25 (use-case, city/highway) + 15 (year)
  // + 15 (brand) + 15 (body type) = 190. Update this whenever score_car()'s
  // possible bonuses change - it's the one place this app makes that assumption.
  const maxScore = 190
  const isTopPick = rank === 1

  return (
    <div className={`bg-white rounded-2xl overflow-hidden transition-shadow ${
      isTopPick
        ? 'border-2 border-primary shadow-lg'
        : 'shadow-card border border-border hover:shadow-card-hover'
    }`}>
      {isTopPick && (
        <div className="bg-primary px-4 py-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-white text-xs font-bold uppercase tracking-widest">
            <Icon name="star" className="w-3.5 h-3.5" filled />
            Top Pick for You
          </span>
          <span className="ml-auto text-teal-200 text-xs">Best match based on your preferences</span>
        </div>
      )}
      <div className={`p-4 ${isTopPick ? 'bg-primary/5' : ''}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Rank badge */}
          <div className={`shrink-0 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center mt-0.5 ${
            isTopPick ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-1' : 'bg-primary text-white'
          }`}>
            {rank}
          </div>

          {/* Image */}
          {car.image_url ? (
            <img src={car.image_url} alt={car.model} className="w-16 h-12 sm:w-24 sm:h-16 object-cover rounded-xl shrink-0 border border-border" />
          ) : (
            <div className="w-16 h-12 sm:w-24 sm:h-16 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
              <Icon name="car" className="w-7 h-7 sm:w-9 sm:h-9 text-gray-300" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">{car.brand.name}</p>
            <p className="font-display font-bold text-gray-900 text-lg leading-tight truncate">{car.model}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {car.year && <span className="text-xs text-muted">{car.year}</span>}
              {car.fuel_type && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${fuelBadgeClass(car.fuel_type)}`}>
                  {car.fuel_type}
                </span>
              )}
              {car.transmission && (
                <span className="text-[11px] text-muted border border-border px-2 py-0.5 rounded-full bg-white">{car.transmission}</span>
              )}
              {car.seats && (
                <span className="text-[11px] text-muted border border-border px-2 py-0.5 rounded-full bg-white">{car.seats} seats</span>
              )}
            </div>
          </div>

          {/* Price + score — desktop only; mobile shows it as a full-width row below instead */}
          <div className="hidden sm:block shrink-0">
            <PriceAndScore car={car} tier={tier} />
          </div>
        </div>

        {/* Price + score — mobile only, since it has no room to sit beside a
            long model name once the image/rank badge also claim space */}
        <div className="sm:hidden mt-3 pt-3 border-t border-border">
          <PriceAndScore car={car} tier={tier} align="left" />
        </div>
      </div>

      {/* Score bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${tier.bar} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Match reasons */}
      <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
        {reasons.map((r, i) => (
          <span key={i} className="text-[11px] bg-primary/8 text-primary font-medium px-2.5 py-1 rounded-full">
            ✓ {r}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <Link
          to={`/cars/${car.id}`}
          className="flex-1 text-center text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white rounded-lg py-2 transition-colors"
        >
          View Details
        </Link>
        <Link
          to={`/calculator?car_id=${car.id}`}
          className="flex-1 text-center text-xs font-semibold text-gray-600 border border-border hover:border-primary hover:text-primary rounded-lg py-2 transition-colors"
        >
          Cost Calculator
        </Link>
      </div>
    </div>
  )
}

export default function Recommendations() {
  const { isAuthenticated, openAuthModal } = useAuth()
  const [budget, setBudget] = useState(1500000)
  const [priceRange, setPriceRange] = useState(FALLBACK_BUDGET_RANGE)
  const [fuelType, setFuelType] = useState(null)
  const isElectric = fuelType === 'Electric'
  const [seats, setSeats] = useState(null)
  const [transmission, setTransmission] = useState(null)
  const [priority, setPriority] = useState(null)
  const [useCase, setUseCase] = useState(null)
  const [yearPref, setYearPref] = useState(null)
  const [brandPref, setBrandPref] = useState([])
  const [bodyType, setBodyType] = useState(null)
  const [brandOptions, setBrandOptions] = useState([])

  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  // Load the real price range and brand list so the form always reflects
  // every car currently in the dataset, instead of hardcoded values that
  // quietly exclude the newest additions (same fix as the budget ceiling
  // used to need - see FilterSidebar for the pattern this mirrors).
  useEffect(() => {
    getFilterOptions()
      .then(opts => {
        if (opts.min_price != null && opts.max_price != null) {
          setPriceRange({ min: Number(opts.min_price), max: Number(opts.max_price) })
        }
        if (opts.brands) setBrandOptions(opts.brands)
      })
      .catch(() => {})
  }, [])

  const toggleBrand = (brand) => {
    setBrandPref(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand])
  }

  const handleFind = async () => {
    if (!isAuthenticated) { openAuthModal(); return }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const data = await getRecommendations({
        budget,
        fuel_type: fuelType || null,
        seats: seats || null,
        transmission: transmission || null,
        priority: priority || null,
        use_case: useCase || null,
        year_preference: yearPref || null,
        brands: brandPref.length > 0 ? brandPref : null,
        body_type: bodyType || null,
        top_n: 6,
      })
      setResults(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setBudget(1500000)
    setFuelType(null)
    setSeats(null)
    setTransmission(null)
    setPriority(null)
    setUseCase(null)
    setYearPref(null)
    setBrandPref([])
    setBodyType(null)
    setResults(null)
    setSearched(false)
    setError(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900">Find Your Perfect Car</h1>
        <p className="text-muted mt-1 text-sm">Tell us your needs — we'll match the best cars from our database.</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6 space-y-6">

        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Your Budget</p>
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{formatLakhOrCrore(budget)}</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${((budget - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={50000}
            value={Math.min(Math.max(budget, priceRange.min), priceRange.max)}
            onChange={e => setBudget(Number(e.target.value))}
            className="w-full h-3 opacity-0 cursor-pointer block -mt-5"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{formatLakhOrCrore(priceRange.min)}</span>
            <span>{formatLakhOrCrore(priceRange.max)}</span>
          </div>
        </div>

        {/* Fuel type */}
        <ChipGroup
          label="Fuel Preference"
          options={FUEL_OPTIONS}
          selected={fuelType}
          onToggle={v => {
            const next = fuelType === v ? null : v
            setFuelType(next)
            if (next === 'Electric') setTransmission(null)
          }}
        />

        {/* Seats */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Minimum Seats</p>
          <div className="flex flex-wrap gap-2">
            {SEAT_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setSeats(seats === n ? null : n)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  seats === n
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white border-border text-gray-600 hover:border-primary/60 hover:text-primary'
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        {/* Transmission — hidden for Electric since all EVs are automatic */}
        {!isElectric && (
          <ChipGroup
            label="Transmission"
            options={TRANSMISSION_OPTIONS}
            selected={transmission}
            onToggle={v => setTransmission(transmission === v ? null : v)}
          />
        )}

        {/* Body type */}
        <ChipGroup
          label="Body Type"
          options={BODY_TYPE_OPTIONS}
          selected={bodyType}
          onToggle={v => setBodyType(bodyType === v ? null : v)}
        />

        {/* Brand preference */}
        {brandOptions.length > 0 && (
          <ChipGroup
            label="Preferred Brands (pick any that work for you)"
            options={brandOptions}
            selected={brandPref}
            onToggle={toggleBrand}
            multi
          />
        )}

        {/* Use case */}
        <ChipGroup
          label="What Will You Use It For?"
          options={USE_CASE_OPTIONS}
          selected={useCase}
          onToggle={v => setUseCase(useCase === v ? null : v)}
        />

        {/* Year preference */}
        <ChipGroup
          label="Model Year"
          options={YEAR_OPTIONS}
          selected={yearPref}
          onToggle={v => setYearPref(yearPref === v ? null : v)}
        />

        {/* Priority */}
        <ChipGroup
          label="What Matters Most"
          options={PRIORITY_OPTIONS}
          selected={priority}
          onToggle={v => setPriority(priority === v ? null : v)}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleFind}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-card"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Finding matches…
              </>
            ) : (
              <>
                <Icon name="target" className="w-4 h-4" />
                Find My Car
              </>
            )}
          </button>
          {searched && (
            <button
              onClick={handleReset}
              className="px-5 py-3.5 rounded-xl border border-border text-sm font-medium text-gray-600 hover:border-error hover:text-error transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-5 text-sm text-error text-center">{error}</p>}

      {/* Results */}
      {results !== null && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-gray-900">
              {results.length > 0 ? `${results.length} cars matched` : 'No matches found'}
            </h2>
            {results.length > 0 && (
              <span className="text-xs text-muted">Best match first</span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card">
              <EmptyState
                icon="search"
                tone="gray"
                title={`No cars found within ${formatLakhOrCrore(budget)}`}
                description="Try increasing your budget or relaxing some filters."
                action={<button onClick={handleReset} className="text-sm font-semibold text-primary hover:underline">Reset filters</button>}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((item, i) => (
                <ResultCard key={item.car.id} item={item} rank={i + 1} />
              ))}
              <p className="text-xs text-muted text-center pt-2">
                Scores based on budget fit, fuel type, seating, mileage, and service cost.{' '}
                <Link to="/cars" className="text-primary hover:underline">Browse all cars →</Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
