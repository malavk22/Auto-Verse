import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { getRecommendations } from '../api/recommendations'
import { getFilterOptions } from '../api/cars'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'
import ChipGroup from '../components/recommendations/ChipGroup'
import ResultCard from '../components/recommendations/ResultCard'
import ResultsSkeleton from '../components/recommendations/ResultsSkeleton'
import { gridContainer, gridItem } from '../utils/motionVariants'

const FUEL_OPTIONS = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']
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
  { value: 'Hatchback', label: 'Hatchback', icon: 'hatchback' },
  { value: 'Sedan', label: 'Sedan', icon: 'sedan' },
  { value: 'SUV', label: 'SUV', icon: 'expand' },
  { value: 'MUV', label: 'MUV', icon: 'users' },
]

// Fallback bounds used only until the real price range loads from the API
// (see priceRange state below) - kept wide so the slider never feels wrong
// while loading, but the live min/max always wins once fetched.
const FALLBACK_BUDGET_RANGE = { min: 300000, max: 30000000 }

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
  const [searchId, setSearchId] = useState(0)
  const resultsRef = useRef(null)

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
    // Scroll to the results area right away (skeleton, then real results
    // once they arrive) rather than waiting for the response - otherwise
    // clicking "Find My Car" leaves you looking at the same form with only
    // the button's spinner as a sign anything happened. The timeout gives
    // the skeleton a tick to actually mount before scrolling to it.
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
      setSearchId(id => id + 1)
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

      {/* Results - scroll-mt accounts for the sticky navbar, same reasoning
          as the calculators' results scroll target. */}
      <div ref={resultsRef} className="scroll-mt-20">
      {loading && <ResultsSkeleton count={6} />}

      {!loading && results !== null && (() => {
        // The min/max score actually present in *this* result set - see
        // ResultCard's matchColor comment for why coloring against these,
        // rather than a fixed universal scale, is what actually makes the
        // results look visually distinguishable from each other.
        const scoreRange = results.length > 0
          ? { min: Math.min(...results.map(r => r.score)), max: Math.max(...results.map(r => r.score)) }
          : { min: 0, max: 0 }
        return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
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
            <motion.div key={searchId} variants={gridContainer} initial="hidden" animate="show" className="space-y-4">
              {results.map((item, i) => (
                <motion.div key={item.car.id} variants={gridItem}>
                  <ResultCard item={item} rank={i + 1} scoreRange={scoreRange} />
                </motion.div>
              ))}
              <p className="text-xs text-muted text-center pt-2">
                Scores based on budget fit, fuel type, seating, mileage, and service cost.{' '}
                <Link to="/cars" className="text-primary hover:underline">Browse all cars →</Link>
              </p>
            </motion.div>
          )}
        </motion.div>
        )
      })()}
      </div>
    </div>
  )
}
