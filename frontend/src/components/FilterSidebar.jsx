import { useState, useRef, useEffect } from 'react'
import { formatLakh } from '../utils/formatCurrency'

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
          open
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : 'border-border bg-white hover:border-primary/60'
        }`}
      >
        <span className={selected ? 'text-gray-900 font-medium' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left ${
                o.value === value
                  ? 'bg-primary/5 text-primary font-medium'
                  : 'text-gray-700 hover:bg-surface-alt'
              }`}
            >
              {o.label}
              {o.value === value && (
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterSidebar({ filters, options, onChange, onReset }) {
  const handleChange = (key, value) => onChange({ ...filters, [key]: value, page: 1 })

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(options.brands?.map(b => ({ value: b, label: b })) || []),
  ]

  const seatOptions = [
    { value: '', label: 'Any' },
    ...(options.seat_options?.map(s => ({ value: s, label: `${s}+ seats` })) || []),
  ]

  return (
    <aside className="w-64 shrink-0 bg-white rounded-lg shadow-card p-5 h-fit sticky top-20">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-gray-900">Filters</h2>
        <button onClick={onReset} className="text-xs text-primary hover:underline">Reset</button>
      </div>

      {/* Brand */}
      <FilterSection label="Brand">
        <CustomSelect
          value={filters.brand || ''}
          onChange={v => handleChange('brand', v || undefined)}
          options={brandOptions}
          placeholder="All Brands"
        />
      </FilterSection>

      {/* Fuel type */}
      <FilterSection label="Fuel Type">
        <div className="flex flex-wrap gap-2">
          {options.fuel_types?.map(f => (
            <button
              key={f}
              onClick={() => handleChange('fuel_type', filters.fuel_type === f ? undefined : f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filters.fuel_type === f
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Transmission */}
      <FilterSection label="Transmission">
        <div className="flex gap-2">
          {options.transmissions?.map(t => (
            <button
              key={t}
              onClick={() => handleChange('transmission', filters.transmission === t ? undefined : t)}
              className={`flex-1 text-xs px-3 py-1.5 rounded border transition-colors ${
                filters.transmission === t
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Seats */}
      <FilterSection label="Min Seats">
        <CustomSelect
          value={filters.seats || ''}
          onChange={v => handleChange('seats', v ? Number(v) : undefined)}
          options={seatOptions}
          placeholder="Any"
        />
      </FilterSection>

      {/* Price range */}
      <FilterSection label="Max Price">
        <input
          type="range"
          min={options.min_price || 0}
          max={options.max_price || 5000000}
          step={100000}
          value={filters.max_price || options.max_price || 5000000}
          onChange={e => handleChange('max_price', Number(e.target.value))}
          className="w-full accent-primary"
        />
        <p className="text-xs text-muted mt-1 text-right">
          Up to {formatLakh(filters.max_price || options.max_price)}
        </p>
      </FilterSection>

      {/* Sort */}
      <FilterSection label="Sort By">
        <select
          value={filters.sort || 'price_asc'}
          onChange={e => handleChange('sort', e.target.value)}
          className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="mileage_desc">Best Mileage</option>
          <option value="year_desc">Newest First</option>
        </select>
      </FilterSection>
    </aside>
  )
}

function FilterSection({ label, children }) {
  return (
    <div className="mb-5 pb-5 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}
