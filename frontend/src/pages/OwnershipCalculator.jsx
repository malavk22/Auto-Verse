import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, Link } from 'react-router-dom'
import { getCar, getCars, getFilterOptions } from '../api/cars'
import { getOwnershipCost, getDepreciation } from '../api/calculators'
import { formatINR, formatLakh } from '../utils/formatCurrency'

const FUEL_DEFAULTS = { Petrol: 103, Diesel: 90, CNG: 85, Electric: 8 }

const COST_COLORS = {
  fuel:         { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  insurance:    { bg: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  maintenance:  { bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  depreciation: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
}

const CONDITIONS = [
  {
    value: 'excellent', label: 'Excellent', icon: '⭐',
    desc: 'No dents or scratches, full service history, single owner — like new.',
    multiplier: '+5%', badge: 'bg-green-100 text-green-700',
    card: { active: 'border-green-500 bg-green-50', text: 'text-green-700' },
  },
  {
    value: 'good', label: 'Good', icon: '👍',
    desc: 'Minor surface wear, regular maintenance, well kept.',
    multiplier: '±0%', badge: 'bg-blue-100 text-blue-700',
    card: { active: 'border-blue-500 bg-blue-50', text: 'text-blue-700' },
  },
  {
    value: 'fair', label: 'Fair', icon: '⚠️',
    desc: 'Visible wear, partial service history, minor dents.',
    multiplier: '−15%', badge: 'bg-yellow-100 text-yellow-700',
    card: { active: 'border-yellow-500 bg-yellow-50', text: 'text-yellow-700' },
  },
  {
    value: 'poor', label: 'Poor', icon: '🔧',
    desc: 'Major dents or rust, skipped services, poor upkeep.',
    multiplier: '−30%', badge: 'bg-orange-100 text-orange-700',
    card: { active: 'border-orange-500 bg-orange-50', text: 'text-orange-700' },
  },
  {
    value: 'damaged', label: 'Damaged', icon: '💥',
    desc: 'Accident history or structural damage.',
    multiplier: '−50%', badge: 'bg-red-100 text-red-700',
    card: { active: 'border-red-500 bg-red-50', text: 'text-red-700' },
  },
]

// ── Custom dropdown ───────────────────────────────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!buttonRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (dropdownRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  const toggle = () => {
    if (disabled) return
    if (!open && buttonRef.current) setPos(buttonRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm transition-all
          ${disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' : ''}
          ${!disabled && open ? 'border-primary ring-2 ring-primary/20 bg-white' : ''}
          ${!disabled && !open ? 'border-border bg-white hover:border-primary/60 hover:shadow-sm' : ''}`}
      >
        <span className={selected?.value !== '' && selected ? 'text-gray-900 font-medium' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.bottom + 4, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: 220 }}
          className="bg-white border border-border rounded-xl shadow-lg overflow-y-auto"
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                ${o.value === value ? 'bg-primary/8 text-primary font-semibold' : 'text-gray-700 hover:bg-surface-alt'}`}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ── Status bar slider with manual input ──────────────────────────────────────
function StatusBar({ label, icon, min, max, step, value, onChange, format, unit, color = 'bg-primary' }) {
  const pct = Math.round(((Math.min(value, max) - min) / (max - min)) * 100)

  const handleInput = (raw) => {
    const v = Number(raw)
    if (isNaN(v) || raw === '') return
    onChange(Math.min(max, Math.max(min, v)))
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => handleInput(e.target.value)}
            onBlur={e => handleInput(e.target.value)}
            className="w-24 text-sm font-bold text-primary text-center bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`absolute left-0 top-0 h-full ${color} rounded-full transition-all duration-150`} style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-3 opacity-0 cursor-pointer block -mt-5"
      />
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

function CostCard({ label, annual, total, years, color, pct }) {
  return (
    <div className={`rounded-xl border ${color.border} ${color.light} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color.text} mb-2`}>{label}</p>
      <p className={`text-lg font-display font-bold ${color.text}`}>{formatLakh(annual)}<span className="text-xs font-normal">/yr</span></p>
      <p className="text-xs text-muted mt-0.5">{formatINR(total)} over {years} yrs</p>
      <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
        <div className={`h-full ${color.bg} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted mt-1 text-right">{pct.toFixed(1)}% of total</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OwnershipCalculator() {
  const [searchParams] = useSearchParams()
  const urlCarId = searchParams.get('car_id')

  const [car, setCar] = useState(null)
  const [carLoading, setCarLoading] = useState(false)
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [carList, setCarList] = useState([])
  const [carListLoading, setCarListLoading] = useState(false)

  // Usage inputs
  const [years, setYears] = useState(5)
  const [annualKm, setAnnualKm] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(103)

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

  useEffect(() => {
    getFilterOptions().then(o => setBrands(o.brands || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!urlCarId) return
    setCarLoading(true)
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
    setCalculating(true)
    setError(null)
    try {
      const [ownership, dep] = await Promise.all([
        getOwnershipCost(car.id, years, annualKm, fuelPrice, condition, accidentHistory, multipleOwners, noServiceRecords),
        getDepreciation(car.id, condition, accidentHistory, multipleOwners, noServiceRecords),
      ])
      setResult(ownership)
      setDepreciation(dep)
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
        <h1 className="text-3xl font-display font-bold text-gray-900">Ownership Cost Calculator</h1>
        <p className="text-muted mt-1 text-sm">Find the true cost of owning a car — fuel, insurance, maintenance, depreciation &amp; condition impact.</p>
      </div>

      {/* ── Step 1: Select a Car ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <h2 className="text-base font-display font-semibold text-gray-900">Select a Car</h2>
        </div>

        {car ? (
          <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
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
                <span className="font-semibold text-primary">{formatLakh(car.price)}</span>
              </div>
            </div>
            <button
              onClick={() => { setCar(null); setResult(null); setDepreciation(null) }}
              className="shrink-0 text-xs font-medium text-gray-500 hover:text-error border border-border hover:border-error px-3 py-1.5 rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        ) : carLoading ? (
          <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <div className="space-y-4">
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
                        className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{c.model}</span>
                          <span className="text-xs text-muted ml-2">{c.year} · {c.fuel_type} · {c.transmission}</span>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{formatLakh(c.price)}</span>
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

      {/* ── Step 2: Set Your Usage ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${car ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
          <h2 className="text-base font-display font-semibold text-gray-900">Set Your Usage</h2>
        </div>

        <div className="space-y-4">
          <StatusBar label="Years of Ownership" icon="📅" min={1} max={10} step={1} value={years} onChange={setYears} format={v => `${v} yr${v > 1 ? 's' : ''}`} unit="yrs" color="bg-primary" />
          <StatusBar label="Annual Distance" icon="🛣️" min={5000} max={100000} step={1000} value={annualKm} onChange={setAnnualKm} format={v => `${(v / 1000).toFixed(0)}k km`} unit="km/yr" color="bg-accent" />

          <div className="bg-gray-50 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⛽</span>
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
                type="number" min={1} max={200} value={fuelPrice}
                onChange={e => setFuelPrice(Number(e.target.value))}
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
        <div className="grid grid-cols-5 gap-2 mb-4">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                condition === c.value
                  ? c.card.active
                  : 'border-border bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{c.icon}</span>
              <span className={`text-xs font-bold ${condition === c.value ? c.card.text : 'text-gray-700'}`}>{c.label}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.badge}`}>{c.multiplier}</span>
            </button>
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
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-card mb-5"
      >
        {calculating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Calculating…
          </>
        ) : 'Calculate Ownership Cost'}
      </button>

      {error && <p className="mb-5 text-sm text-error text-center">{error}</p>}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && (
        <div ref={resultsRef} className="space-y-5">

          {/* Total banner */}
          <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6">
            <p className="text-sm font-medium text-teal-100 mb-1">
              Total cost — {result.brand} {result.model} · {years} yr{years > 1 ? 's' : ''} · {(annualKm / 1000).toFixed(0)}k km/yr
            </p>
            <p className="text-4xl font-display font-bold">{formatINR(result.total_ownership_cost)}</p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-teal-200 text-xs">Per Year</p>
                <p className="font-semibold">{formatINR(result.cost_per_year)}</p>
              </div>
              <div>
                <p className="text-teal-200 text-xs">Per Kilometre</p>
                <p className="font-semibold">₹{Number(result.cost_per_km).toFixed(2)}/km</p>
              </div>
            </div>
          </div>

          {/* Resale value impact */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-4">Condition Impact on Resale Value</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Purchase Price</p>
                <p className="text-lg font-display font-bold text-blue-700">{formatLakh(result.ex_showroom_price)}</p>
              </div>
              <div className="bg-gray-50 border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Standard Resale</p>
                <p className="text-lg font-display font-bold text-gray-700">{formatLakh(result.standard_resale_value)}</p>
                <p className="text-[10px] text-muted mt-0.5">IRDAI value at yr {years}</p>
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
                }`}>{formatLakh(result.adjusted_resale_value)}</p>
                <p className={`text-[10px] mt-0.5 font-semibold ${
                  Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Number(result.adjusted_resale_value) >= Number(result.standard_resale_value) ? '+' : '−'}
                  {formatLakh(Math.abs(Number(result.adjusted_resale_value) - Number(result.standard_resale_value)))} vs standard
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
                <p className={`text-lg font-display font-bold ${COST_COLORS.depreciation.text}`}>{formatLakh(result.total_depreciation)}<span className="text-xs font-normal"> total</span></p>
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
              <p className="text-xs text-muted mb-5">IRDAI standard value vs your adjusted value based on condition.</p>
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
                                ({diff >= 0 ? '+' : ''}{formatLakh(diff)})
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-4">* Estimates based on IRDAI depreciation rates and condition multipliers. Actual resale value depends on market demand and location.</p>
            </div>
          )}

          {/* Assumptions */}
          <div className="bg-surface-alt rounded-xl p-5 text-xs text-muted space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Assumptions</p>
            <p>• Insurance estimated at 2.5% of ex-showroom price per year</p>
            <p>• Fuel cost = (Annual KM ÷ Mileage) × Fuel price</p>
            <p>• Maintenance = annual service cost from manufacturer data</p>
            <p>• Depreciation follows IRDAI schedule: 15% Year 1, 10% each subsequent year</p>
            <p>• Condition multipliers: Excellent ×1.05 · Good ×1.00 · Fair ×0.85 · Poor ×0.70 · Damaged ×0.50</p>
            <p>• Additional deductions: Accident −15% · Multiple owners −5% · No service records −8%</p>
          </div>
        </div>
      )}
    </div>
  )
}
