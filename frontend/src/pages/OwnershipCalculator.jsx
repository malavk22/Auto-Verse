import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { getCar, getCars, getFilterOptions } from '../api/cars'
import { getOwnershipCost, getDepreciation } from '../api/calculators'
import { formatINR, formatLakhOrCrore } from '../utils/formatCurrency'
import CustomSelect from '../components/ui/CustomSelect'
import StatusBar from '../components/ui/StatusBar'
import Icon from '../components/ui/Icon'
import Counter from '../components/ui/Counter'
import EmiCalculatorPanel from '../components/calculators/EmiCalculatorPanel'
import { useAuth } from '../context/AuthContext'
import { getRecentlyViewed } from '../utils/recentlyViewed'

const FUEL_DEFAULTS = { Petrol: 103, Diesel: 90, CNG: 85, Electric: 8 }

const COST_COLORS = {
  fuel:         { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  insurance:    { bg: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  maintenance:  { bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  depreciation: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
}

const CONDITIONS = [
  {
    value: 'excellent', label: 'Excellent', icon: 'star',
    desc: 'No dents or scratches, full service history, single owner — like new.',
    multiplier: '+5%', badge: 'bg-green-100 text-green-700',
    card: { active: 'border-green-500 bg-green-50', text: 'text-green-700' },
  },
  {
    value: 'good', label: 'Good', icon: 'checkCircle',
    desc: 'Minor surface wear, regular maintenance, well kept.',
    multiplier: '±0%', badge: 'bg-blue-100 text-blue-700',
    card: { active: 'border-blue-500 bg-blue-50', text: 'text-blue-700' },
  },
  {
    value: 'fair', label: 'Fair', icon: 'alertTriangle',
    desc: 'Visible wear, partial service history, minor dents.',
    multiplier: '−15%', badge: 'bg-yellow-100 text-yellow-700',
    card: { active: 'border-yellow-500 bg-yellow-50', text: 'text-yellow-700' },
  },
  {
    value: 'poor', label: 'Poor', icon: 'sliders',
    desc: 'Major dents or rust, skipped services, poor upkeep.',
    multiplier: '−30%', badge: 'bg-orange-100 text-orange-700',
    card: { active: 'border-orange-500 bg-orange-50', text: 'text-orange-700' },
  },
  {
    value: 'damaged', label: 'Damaged', icon: 'xCircle',
    desc: 'Accident history or structural damage.',
    multiplier: '−50%', badge: 'bg-red-100 text-red-700',
    card: { active: 'border-red-500 bg-red-50', text: 'text-red-700' },
  },
]

function CostCard({ label, annual, total, years, color, pct }) {
  return (
    <div className={`rounded-xl border ${color.border} ${color.light} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color.text} mb-2`}>{label}</p>
      <p className={`text-lg font-display font-bold ${color.text}`}>{formatINR(annual)}<span className="text-xs font-normal">/yr</span></p>
      <p className="text-xs text-muted mt-0.5">{formatINR(total)} over {years} yrs</p>
      <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full ${color.bg} rounded-full`}
        />
      </div>
      <p className="text-xs text-muted mt-1 text-right">{pct.toFixed(1)}% of total</p>
    </div>
  )
}

// Mirrors the real results' shape (total banner, resale grid, cost
// breakdown grid, schedule table) while a calculation is in flight -
// swapped in via `calculating`, same "shaped skeleton over generic
// spinner" pattern used on Compare/Browse Cars.
function OwnershipResultsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-[164px]" />
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="h-5 w-56 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-3">
        <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-6 bg-gray-100 rounded" />)}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OwnershipCalculator() {
  const { isAuthenticated, openAuthModal } = useAuth()
  const [searchParams] = useSearchParams()
  const urlCarId = searchParams.get('car_id')
  const urlTab = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState(urlTab === 'emi' ? 'emi' : 'ownership')
  const [car, setCar] = useState(null)
  const [carLoading, setCarLoading] = useState(false)
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  // Read once on mount - this is a small shortcut row, not the full History
  // feature, so it doesn't need Home's cross-tab live-sync listeners.
  const [recentlyViewed] = useState(getRecentlyViewed)
  const [carList, setCarList] = useState([])
  const [carListLoading, setCarListLoading] = useState(false)

  // Usage inputs
  const [years, setYears] = useState(5)
  const [annualKm, setAnnualKm] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(103)
  // Local editable draft, decoupled from `fuelPrice` - a plain
  // `onChange={e => setFuelPrice(Number(e.target.value))}` turns a cleared
  // field into 0 the instant it's emptied (Number('') === 0), so backspacing
  // to retype a price showed "0" instead of a truly empty box. Committing
  // (parsing + clamping) only on blur mirrors the fix in StatusBar.jsx.
  const [fuelPriceDraft, setFuelPriceDraft] = useState('103')
  const fuelPriceFocused = useRef(false)

  // Condition inputs
  const [condition, setCondition] = useState('good')
  const [accidentHistory, setAccidentHistory] = useState(false)
  const [multipleOwners, setMultipleOwners] = useState(false)
  const [noServiceRecords, setNoServiceRecords] = useState(false)

  const [result, setResult] = useState(null)
  const [depreciation, setDepreciation] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)
  const resultsRef = useRef(null)

  // Results only recompute on an explicit Calculate click, so changing an
  // input afterward silently leaves stale numbers on screen. Snapshotting
  // the inputs a result was computed from and comparing on every render
  // gives a cheap, always-correct `isStale` flag.
  const lastCalculatedKeyRef = useRef(null)
  const currentInputsKey = JSON.stringify({ carId: car?.id, years, annualKm, fuelPrice, condition, accidentHistory, multipleOwners, noServiceRecords })
  const isStale = !!result && lastCalculatedKeyRef.current !== currentInputsKey

  useEffect(() => {
    getFilterOptions().then(o => setBrands(o.brands || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!fuelPriceFocused.current) setFuelPriceDraft(String(fuelPrice))
  }, [fuelPrice])

  useEffect(() => {
    if (!urlCarId) return
    setCarLoading(true)
    // Clears any results already on screen - otherwise navigating here via
    // a different car's link left stale figures mismatched with Step 1.
    setResult(null)
    setDepreciation(null)
    getCar(urlCarId)
      .then(data => { setCar(data); setFuelPrice(FUEL_DEFAULTS[data.fuel_type] ?? 103); setCarLoading(false) })
      .catch(() => setCarLoading(false))
  }, [urlCarId])

  useEffect(() => {
    if (!selectedBrand) { setCarList([]); return }
    setCarListLoading(true)
    getCars({ brand: selectedBrand, limit: 100, sort: 'price_asc' })
      .then(data => { setCarList(data.items || []); setCarListLoading(false) })
      .catch(() => setCarListLoading(false))
  }, [selectedBrand])

  const selectCar = (c) => {
    setCar(c)
    setFuelPrice(FUEL_DEFAULTS[c.fuel_type] ?? 103)
    setResult(null)
    setDepreciation(null)
    setSelectedBrand('')
    setCarList([])
  }

  const handleCalculate = async () => {
    if (!car) return
    if (!isAuthenticated) { openAuthModal(); return }
    setCalculating(true)
    setError(null)
    try {
      const [ownership, dep] = await Promise.all([
        getOwnershipCost(car.id, years, annualKm, fuelPrice, condition, accidentHistory, multipleOwners, noServiceRecords),
        getDepreciation(car.id, condition, accidentHistory, multipleOwners, noServiceRecords),
      ])
      setResult(ownership)
      setDepreciation(dep)
      lastCalculatedKeyRef.current = currentInputsKey
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Failed to calculate. Please try again.')
    } finally {
      setCalculating(false)
    }
  }

  const totalCost = result ? Number(result.total_ownership_cost) : 0
  const costPct = (val, multiplier = 1) => totalCost > 0 ? (Number(val) * multiplier / totalCost) * 100 : 0

  const brandOptions = [
    { value: '', label: 'Select a brand…' },
    ...brands.map(b => ({ value: b, label: b })),
  ]

  const selectedCondition = CONDITIONS.find(c => c.value === condition)
  const conditionFlags = [accidentHistory, multipleOwners, noServiceRecords].filter(Boolean).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900">
          {activeTab === 'emi' ? 'Loan EMI Calculator' : 'Ownership Cost Calculator'}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {activeTab === 'emi'
            ? 'Estimate your monthly loan payment — principal, interest, and the full repayment schedule.'
            : 'Find the true cost of owning a car — fuel, insurance, maintenance, depreciation & condition impact.'}
        </p>
      </div>

      {/* ── Step 1: Select a Car ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <h2 className="text-base font-display font-semibold text-gray-900">Select a Car</h2>
        </div>

        {car ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-4 min-w-0">
              {car.image_url && (
                <img src={car.image_url} alt={car.model} className="w-20 h-14 object-cover rounded-lg shrink-0 border border-border" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-0.5">{car.brand.name}</p>
                <p className="font-display font-bold text-gray-900 text-lg leading-tight truncate">{car.model}</p>
                <div className="flex items-center flex-wrap gap-2 text-xs text-muted mt-1">
                  {car.year && <span>{car.year}</span>}
                  {car.fuel_type && <span className="bg-white border border-border px-2 py-0.5 rounded-full">{car.fuel_type}</span>}
                  {car.transmission && <span className="bg-white border border-border px-2 py-0.5 rounded-full">{car.transmission}</span>}
                  <span className="font-semibold text-primary">{formatLakhOrCrore(car.price)}</span>
                </div>
              </div>
              {/* Change — inline on sm+; on mobile it moves below instead of
                  squeezing the model name into a 2-3 character ellipsis */}
              <button
                onClick={() => { setCar(null); setResult(null); setDepreciation(null) }}
                className="hidden sm:block shrink-0 text-xs font-medium text-gray-500 hover:text-error border border-border hover:border-error px-3 py-1.5 rounded-lg transition-colors"
              >
                Change
              </button>
            </div>
            <button
              onClick={() => { setCar(null); setResult(null); setDepreciation(null) }}
              className="sm:hidden self-start shrink-0 text-xs font-medium text-gray-500 hover:text-error border border-border hover:border-error px-3 py-1.5 rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        ) : carLoading ? (
          <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <div className="space-y-4">
            {/* Quick-pick from Recently Viewed - covers the direct-navbar
                entry path, which otherwise always started from a blank
                Brand dropdown. Hidden when there's no history yet. */}
            {recentlyViewed.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Recently Viewed</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentlyViewed.slice(0, 6).map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCar(c)}
                      className="flex items-center gap-2 shrink-0 border border-border rounded-xl pl-1.5 pr-3 py-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-alt shrink-0 flex items-center justify-center">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.model} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="car" className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">{c.brand.name} {c.model}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Brand</label>
              <CustomSelect
                value={selectedBrand}
                onChange={setSelectedBrand}
                options={brandOptions}
                placeholder="Select a brand…"
              />
            </div>

            {selectedBrand && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Model — {carList.length} available
                </label>
                {carListLoading ? (
                  <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
                    {carList.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted">No cars found.</p>
                    ) : carList.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selectCar(c)}
                        className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-alt shrink-0 flex items-center justify-center">
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.model} className="w-full h-full object-cover" />
                          ) : (
                            <Icon name="car" className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-900">{c.model}</span>
                          <span className="text-xs text-muted ml-2">{c.year} · {c.fuel_type} · {c.transmission}</span>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{formatLakhOrCrore(c.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedBrand && (
              <p className="text-xs text-muted">
                Or <Link to="/cars" className="text-primary hover:underline font-medium">browse cars</Link> and click "Calculate Ownership Cost" on any car detail page.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'ownership', label: 'Ownership Cost' },
          { key: 'emi', label: 'Loan EMI' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`relative isolate flex-1 text-sm font-semibold py-2.5 rounded-lg transition-colors ${
              activeTab === t.key ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === t.key && (
              <motion.span
                layoutId="calc-tab-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-card -z-10"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'emi' && <EmiCalculatorPanel car={car} onSwitchToOwnership={() => setActiveTab('ownership')} />}

      {activeTab === 'ownership' && (<>

      {/* ── Step 2: Set Your Usage ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${car ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
          <h2 className="text-base font-display font-semibold text-gray-900">Set Your Usage</h2>
        </div>

        <div className="space-y-4">
          <StatusBar label="Years of Ownership" icon="calendar" min={1} max={10} step={1} value={years} onChange={setYears} format={v => `${v} yr${v > 1 ? 's' : ''}`} unit="yrs" color="bg-primary" />
          <StatusBar label="Annual Distance" icon="road" min={5000} max={100000} step={1000} value={annualKm} onChange={setAnnualKm} format={v => `${(v / 1000).toFixed(0)}k km`} unit="km/yr" color="bg-accent" />

          <div className="bg-gray-50 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon name="fuel" className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Fuel Price
                  {car?.fuel_type === 'Electric' && <span className="ml-1 text-xs text-muted font-normal">(₹/unit)</span>}
                  {car?.fuel_type === 'CNG' && <span className="ml-1 text-xs text-muted font-normal">(₹/kg)</span>}
                </span>
              </div>
              <span className="text-xs text-muted">{car?.fuel_type ? `Default for ${car.fuel_type}` : 'Petrol default'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500">₹</span>
              <input
                type="number" min={1} max={200} value={fuelPriceDraft}
                onFocus={() => { fuelPriceFocused.current = true }}
                onChange={e => setFuelPriceDraft(e.target.value)}
                onBlur={e => {
                  fuelPriceFocused.current = false
                  const v = Number(e.target.value)
                  const clamped = e.target.value === '' || isNaN(v) ? fuelPrice : Math.min(200, Math.max(1, v))
                  setFuelPrice(clamped)
                  setFuelPriceDraft(String(clamped))
                }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                className="w-28 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white font-semibold"
              />
              <span className="text-xs text-muted">Avg: Petrol ₹103 · Diesel ₹90 · CNG ₹85 · EV ₹8/u</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step 3: Car Condition ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${car ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>3</span>
          <h2 className="text-base font-display font-semibold text-gray-900">Car Condition</h2>
          <span className="ml-auto text-xs text-muted">Affects resale / market value</span>
        </div>

        {/* Condition cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {CONDITIONS.map(c => (
            <motion.button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              whileTap={{ scale: 0.94 }}
              animate={condition === c.value ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.25 }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                condition === c.value
                  ? c.card.active
                  : 'border-border bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon name={c.icon} className={`w-5 h-5 ${condition === c.value ? c.card.text : 'text-gray-500'}`} />
              <span className={`text-xs font-bold ${condition === c.value ? c.card.text : 'text-gray-700'}`}>{c.label}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.badge}`}>{c.multiplier}</span>
            </motion.button>
          ))}
        </div>

        {/* Selected condition description */}
        <p className="text-xs text-muted bg-gray-50 rounded-lg px-3 py-2 mb-5 border border-border">
          <span className="font-semibold text-gray-700">{selectedCondition?.label}: </span>
          {selectedCondition?.desc}
        </p>

        {/* Flags */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Additional Deductions</p>
        <div className="space-y-3">
          {[
            { label: 'Accident history', desc: '−15% from resale value', state: accidentHistory, set: setAccidentHistory },
            { label: 'More than 1 previous owner', desc: '−5% from resale value', state: multipleOwners, set: setMultipleOwners },
            { label: 'No service records available', desc: '−8% from resale value', state: noServiceRecords, set: setNoServiceRecords },
          ].map((f, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group select-none">
              <div
                onClick={() => f.set(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  f.state ? 'bg-primary border-primary' : 'border-gray-300 bg-white group-hover:border-primary/60'
                }`}
              >
                {f.state && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">{f.label}</span>
              <span className={`text-xs font-semibold ${f.state ? 'text-error' : 'text-gray-400'}`}>{f.desc}</span>
            </label>
          ))}
        </div>

        {conditionFlags > 0 && (
          <p className="mt-3 text-xs text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {conditionFlags} deduction flag{conditionFlags > 1 ? 's' : ''} applied — resale value will be further reduced.
          </p>
        )}
      </div>

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={!car || calculating}
        className={`w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-card mb-5 ${
          isStale ? 'bg-accent hover:bg-accent-dark' : 'bg-primary hover:bg-primary-dark'
        }`}
      >
        {calculating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Calculating…
          </>
        ) : isStale ? 'Recalculate Ownership Cost' : 'Calculate Ownership Cost'}
      </button>

      {error && <p className="mb-5 text-sm text-error text-center">{error}</p>}

      {calculating && <OwnershipResultsSkeleton />}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {!calculating && result && (<>

        {isStale && (
          <div className="mb-5 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Icon name="alertTriangle" className="w-4 h-4 shrink-0" />
            Inputs changed since this was calculated — the numbers below are from your previous settings. Click "Recalculate" above to update them.
          </div>
        )}

        <motion.div
          ref={resultsRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          // scroll-mt accounts for the sticky navbar (h-16) - without it,
          // scrollIntoView's `block: 'start'` lands this element's top edge
          // flush with the viewport top, which is *underneath* the sticky
          // navbar, hiding the "Total cost — ..." label line behind it.
          // Dimmed while stale, so outdated figures visually read as "old"
          // even before you've noticed the banner above.
          className={`space-y-5 scroll-mt-20 transition-opacity ${isStale ? 'opacity-50' : ''}`}
        >

          {/* Total banner */}
          <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6">
            <p className="text-sm font-medium text-teal-100 mb-1">
              Total cost — {result.brand} {result.model} · {years} yr{years > 1 ? 's' : ''} · {(annualKm / 1000).toFixed(0)}k km/yr
            </p>
            <p className="text-4xl font-display font-bold"><Counter target={Number(result.total_ownership_cost)} format={formatINR} /></p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-teal-200 text-xs">Per Year</p>
                <p className="font-semibold"><Counter target={Number(result.cost_per_year)} format={formatINR} /></p>
              </div>
              <div>
                <p className="text-teal-200 text-xs">Per Kilometre</p>
                <p className="font-semibold"><Counter target={Number(result.cost_per_km)} format={v => `₹${v.toFixed(2)}/km`} /></p>
              </div>
            </div>
          </div>

          {/* Cross-link to the other tab - this total doesn't include loan
              interest at all (it's a cash-purchase running-cost figure), so
              anyone financing the car is missing a real cost unless they
              also check the EMI tab. */}
          <button
            onClick={() => setActiveTab('emi')}
            className="w-full flex items-center gap-2.5 text-sm text-gray-700 bg-surface-alt hover:bg-primary/5 border border-border hover:border-primary/30 rounded-xl px-4 py-3 transition-colors text-left"
          >
            <Icon name="trendingUp" className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1">Financing this car? This total doesn't include loan interest — check the <span className="font-semibold text-primary">Loan EMI</span> tab too.</span>
            <Icon name="expand" className="w-3.5 h-3.5 text-muted shrink-0" />
          </button>

          {/* Resale value impact */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-4">Condition Impact on Resale Value</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Purchase Price</p>
                <p className="text-lg font-display font-bold text-blue-700">{formatLakhOrCrore(result.ex_showroom_price)}</p>
              </div>
              <div className="bg-gray-50 border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Standard Resale</p>
                <p className="text-lg font-display font-bold text-gray-700">{formatLakhOrCrore(result.standard_resale_value)}</p>
                <p className="text-[10px] text-muted mt-0.5">{years <= 5 ? 'IRDAI value' : 'Estimated value'} at yr {years}</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${
                Number(result.adjusted_resale_value) >= Number(result.standard_resale_value)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? 'text-green-600' : 'text-red-600'
                }`}>Your Resale Value</p>
                <p className={`text-lg font-display font-bold ${
                  Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? 'text-green-700' : 'text-red-700'
                }`}>{formatLakhOrCrore(result.adjusted_resale_value)}</p>
                <p className={`text-[10px] mt-0.5 font-semibold ${
                  Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? '+' : '−'}
                  {formatLakhOrCrore(Math.abs(Number(result.adjusted_resale_value) - Number(result.standard_resale_value)))} vs standard
                </p>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Condition: <span className="font-semibold text-gray-700 capitalize">{result.condition}</span>
              {' · '}Multiplier: <span className="font-semibold text-gray-700">{(Number(result.condition_multiplier) * 100).toFixed(1)}%</span>
            </p>
          </div>

          {/* Cost breakdown */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
            <div className="grid grid-cols-2 gap-4">
              <CostCard label="Fuel Cost" annual={result.annual_fuel_cost} total={Number(result.annual_fuel_cost) * years} years={years} color={COST_COLORS.fuel} pct={costPct(result.annual_fuel_cost, years)} />
              <CostCard label="Insurance" annual={result.annual_insurance} total={Number(result.annual_insurance) * years} years={years} color={COST_COLORS.insurance} pct={costPct(result.annual_insurance, years)} />
              <CostCard label="Maintenance" annual={result.annual_maintenance} total={Number(result.annual_maintenance) * years} years={years} color={COST_COLORS.maintenance} pct={costPct(result.annual_maintenance, years)} />
              <div className={`rounded-xl border ${COST_COLORS.depreciation.border} ${COST_COLORS.depreciation.light} p-4`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${COST_COLORS.depreciation.text} mb-2`}>Depreciation</p>
                <p className={`text-lg font-display font-bold ${COST_COLORS.depreciation.text}`}>{formatLakhOrCrore(result.total_depreciation)}<span className="text-xs font-normal"> total</span></p>
                <p className="text-xs text-muted mt-0.5">Value lost over {years} yrs</p>
                <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                  <div className={`h-full ${COST_COLORS.depreciation.bg} rounded-full transition-all duration-700`} style={{ width: `${costPct(result.total_depreciation)}%` }} />
                </div>
                <p className="text-xs text-muted mt-1 text-right">{costPct(result.total_depreciation).toFixed(1)}% of total</p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Cost Composition</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div className="bg-orange-500" style={{ width: `${costPct(result.annual_fuel_cost, years)}%` }} />
                <div className="bg-blue-500"   style={{ width: `${costPct(result.annual_insurance, years)}%` }} />
                <div className="bg-green-500"  style={{ width: `${costPct(result.annual_maintenance, years)}%` }} />
                <div className="bg-purple-500" style={{ width: `${costPct(result.total_depreciation)}%` }} />
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {[['Fuel','bg-orange-500'],['Insurance','bg-blue-500'],['Maintenance','bg-green-500'],['Depreciation','bg-purple-500']].map(([label, cls]) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />{label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Depreciation schedule */}
          {depreciation && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-base font-display font-semibold text-gray-900 mb-1">Depreciation Schedule</h3>
              <p className="text-xs text-muted mb-5">Standard value (IRDAI schedule through year 5, estimated beyond) vs your adjusted value based on condition.</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide py-2 pr-3">Year</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide py-2 pr-3">Retained</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2 pr-3">Standard Value</th>
                      <th className="text-left text-xs font-semibold text-primary uppercase tracking-wide py-2">Your Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciation.schedule.map((row, i) => {
                      const isHighlight = i === years
                      const diff = Number(row.adjusted_value) - Number(row.value)
                      return (
                        <tr key={row.year} className={`border-b border-border last:border-0 ${isHighlight ? 'bg-primary/5' : ''}`}>
                          <td className="py-3 pr-3 text-sm font-medium text-gray-900">
                            {row.year === 0 ? 'Purchase' : `Year ${row.year}`}
                            {isHighlight && <span className="ml-1.5 text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded-full">your plan</span>}
                          </td>
                          <td className="py-3 pr-3 text-sm text-gray-500">{row.percentage}%</td>
                          <td className="py-3 pr-3 text-sm font-semibold text-gray-700">{formatINR(row.value)}</td>
                          <td className="py-3">
                            <span className={`text-sm font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatINR(row.adjusted_value)}
                            </span>
                            {row.year > 0 && diff !== 0 && (
                              <span className={`ml-1.5 text-[10px] font-semibold ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ({diff >= 0 ? '+' : ''}{formatLakhOrCrore(diff)})
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-4">* Years 0–5 follow the published IRDAI depreciation schedule; years 6–10 extrapolate the same trend since IRDAI does not publish rates beyond 5 years. Actual resale value depends on market demand and location.</p>
            </div>
          )}

          {/* Assumptions */}
          <div className="bg-surface-alt rounded-xl p-5 text-xs text-muted space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Assumptions</p>
            <p>• Insurance estimated at 2.5% of ex-showroom price per year</p>
            <p>• Fuel cost = (Annual KM ÷ Mileage) × Fuel price</p>
            <p>• Maintenance = annual service cost from manufacturer data</p>
            <p>• Depreciation follows the IRDAI schedule through year 5 (15/20/30/40/50%), then an estimated 5% further per year</p>
            <p>• Condition multipliers: Excellent ×1.05 · Good ×1.00 · Fair ×0.85 · Poor ×0.70 · Damaged ×0.50</p>
            <p>• Additional deductions: Accident −15% · Multiple owners −5% · No service records −8%</p>
          </div>
        </motion.div>
      </>)}

      </>)}
    </div>
  )
}
