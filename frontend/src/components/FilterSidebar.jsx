import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatLakhOrCrore } from '../utils/formatCurrency'

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
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
    if (!open && buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 text-sm px-3 py-2.5 rounded-lg border transition-all ${
          open
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : 'border-border bg-white hover:border-primary/60 hover:shadow-sm'
        }`}
      >
        <span className={selected?.value !== '' && selected ? 'text-gray-900 font-medium' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999, maxHeight: '240px' }}
          className="bg-white border border-border rounded-lg shadow-lg overflow-y-auto"
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left ${
                o.value === value ? 'bg-primary/8 text-primary font-semibold' : 'text-gray-700 hover:bg-surface-alt'
              }`}
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

function FilterSection({ label, children }) {
  return (
    <div className="mb-5 pb-5 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">{label}</p>
      {children}
    </div>
  )
}

function FilterBody({ filters, options, onChange, onReset, activeCount, mobile, onClose }) {
  const handleChange = (key, value) => onChange({ ...filters, [key]: value, page: 1 })

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(options.brands?.map(b => ({ value: b, label: b })) || []),
  ]
  const seatOptions = [
    { value: '', label: 'Any' },
    ...(options.seat_options?.map(s => ({ value: String(s), label: `${s}+ seats` })) || []),
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-gray-900 text-sm">Filters</h2>
          {activeCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs text-primary hover:underline disabled:text-gray-300"
            disabled={activeCount === 0}
          >
            Reset all
          </button>
          {mobile && (
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
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
        <div className="flex flex-wrap gap-1.5">
          {options.fuel_types?.map(f => (
            <button
              key={f}
              onClick={() => handleChange('fuel_type', filters.fuel_type === f ? undefined : f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filters.fuel_type === f
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'border-border text-gray-600 hover:border-primary hover:text-primary bg-white'
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
              className={`flex-1 text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                filters.transmission === t
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'border-border text-gray-600 hover:border-primary hover:text-primary bg-white'
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
          value={filters.seats ? String(filters.seats) : ''}
          onChange={v => handleChange('seats', v ? Number(v) : undefined)}
          options={seatOptions}
          placeholder="Any"
        />
      </FilterSection>

      {/* Price Range */}
      <FilterSection label="Price Range">
        <div className="px-1">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Min</span>
            <span className="font-semibold text-primary">
              {filters.min_price ? formatLakhOrCrore(filters.min_price) : formatLakhOrCrore(options.min_price || 0)}
            </span>
          </div>
          <input
            type="range"
            min={options.min_price || 0}
            max={options.max_price || 6600000}
            step={100000}
            value={filters.min_price || options.min_price || 0}
            onChange={e => {
              const val = Number(e.target.value)
              const clamped = filters.max_price != null ? Math.min(val, filters.max_price) : val
              onChange({
                ...filters,
                min_price: clamped <= (options.min_price || 0) ? undefined : clamped,
                sort: 'price_asc',
                page: 1,
              })
            }}
            className="w-full accent-primary cursor-pointer"
          />
        </div>
        <div className="px-1 mt-3">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Max</span>
            <span className="font-semibold text-primary">
              {filters.max_price ? formatLakhOrCrore(filters.max_price) : formatLakhOrCrore(options.max_price || 6600000)}
            </span>
          </div>
          <input
            type="range"
            min={options.min_price || 0}
            max={options.max_price || 6600000}
            step={100000}
            value={filters.max_price || options.max_price || 6600000}
            onChange={e => {
              const val = Number(e.target.value)
              const clamped = filters.min_price != null ? Math.max(val, filters.min_price) : val
              onChange({
                ...filters,
                max_price: clamped >= (options.max_price || 6600000) ? undefined : clamped,
                sort: 'price_asc',
                page: 1,
              })
            }}
            className="w-full accent-primary cursor-pointer"
          />
        </div>
      </FilterSection>

      {/* Sort */}
      <FilterSection label="Sort By">
        <select
          value={filters.sort || 'year_desc'}
          onChange={e => handleChange('sort', e.target.value)}
          className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-gray-700"
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="mileage_desc">Best Mileage</option>
          <option value="year_desc">Newest First</option>
          <option value="none">None</option>
        </select>
      </FilterSection>
    </>
  )
}

export default function FilterSidebar({ filters, options, onChange, onReset, mobile = false, onClose }) {
  const activeCount = [
    filters.brand, filters.fuel_type, filters.transmission,
    filters.seats, filters.min_price, filters.max_price,
  ].filter(Boolean).length

  const bodyProps = { filters, options, onChange, onReset, activeCount, mobile, onClose }

  if (mobile) {
    return (
      <div className="p-5">
        <FilterBody {...bodyProps} />
      </div>
    )
  }

  return (
    <div className="w-64 shrink-0 sticky top-20 self-start h-[calc(100vh-5.5rem)]">
      <aside className="h-full overflow-y-auto bg-white rounded-xl shadow-card p-5">
        <FilterBody {...bodyProps} />
      </aside>
    </div>
  )
}
