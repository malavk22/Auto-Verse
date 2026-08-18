import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import Icon from './ui/Icon'

export const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'mileage_desc', label: 'Best Mileage' },
  { value: 'year_desc', label: 'Newest First' },
  { value: 'none', label: 'None' },
]

export function CustomSelect({ value, onChange, options, placeholder }) {
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

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              key="dropdown"
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999, maxHeight: '240px' }}
              className="origin-top bg-white border border-border rounded-lg shadow-lg overflow-y-auto"
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// Section wrapper - icon + label give each filter category a consistent
// visual anchor (same pattern as Car Detail's grouped spec table), and the
// small dot next to the label is a quick "this filter is currently active"
// signal without having to read the actual value.
function FilterSection({ label, icon, active, children }) {
  return (
    <div className="mb-5 pb-5 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <Icon name={icon} className="w-3.5 h-3.5 text-primary" />}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
      </div>
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

  const priceActive = filters.min_price != null || filters.max_price != null

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
          <AnimatePresence initial={false}>
            {activeCount > 0 && (
              <motion.button
                key="reset-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={onReset}
                className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors"
              >
                <Icon name="xCircle" className="w-3 h-3" />
                Reset all
              </motion.button>
            )}
          </AnimatePresence>
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
      <FilterSection label="Brand" icon="building" active={!!filters.brand}>
        <CustomSelect
          value={filters.brand || ''}
          onChange={v => handleChange('brand', v || undefined)}
          options={brandOptions}
          placeholder="All Brands"
        />
      </FilterSection>

      {/* Price Range - two separate, independent sliders (not a merged
          dual-handle track, which is confusing to drag when the two
          handles get close together). Placed right under Brand since
          budget is usually the second thing people narrow down by, not
          buried at the bottom of the list. */}
      <FilterSection label="Price Range" icon="wallet" active={priceActive}>
        {priceActive && (
          <div className="flex justify-center mb-3">
            <span className="text-xs font-semibold text-primary bg-primary/8 px-3 py-1 rounded-full">
              {formatLakhOrCrore(filters.min_price || options.min_price || 0)} – {formatLakhOrCrore(filters.max_price || options.max_price || 30000000)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>Min</span>
          <span className="font-semibold text-primary">
            {filters.min_price ? formatLakhOrCrore(filters.min_price) : formatLakhOrCrore(options.min_price || 0)}
          </span>
        </div>
        <input
          type="range"
          min={options.min_price || 0}
          max={options.max_price || 30000000}
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

        <div className="flex justify-between text-xs text-muted mb-1 mt-3">
          <span>Max</span>
          <span className="font-semibold text-primary">
            {filters.max_price ? formatLakhOrCrore(filters.max_price) : formatLakhOrCrore(options.max_price || 30000000)}
          </span>
        </div>
        <input
          type="range"
          min={options.min_price || 0}
          max={options.max_price || 30000000}
          step={100000}
          value={filters.max_price || options.max_price || 30000000}
          onChange={e => {
            const val = Number(e.target.value)
            const clamped = filters.min_price != null ? Math.max(val, filters.min_price) : val
            onChange({
              ...filters,
              max_price: clamped >= (options.max_price || 30000000) ? undefined : clamped,
              sort: 'price_asc',
              page: 1,
            })
          }}
          className="w-full accent-primary cursor-pointer"
        />
      </FilterSection>

      {/* Fuel type */}
      <FilterSection label="Fuel Type" icon="fuel" active={!!filters.fuel_type}>
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
      <FilterSection label="Transmission" icon="sliders" active={!!filters.transmission}>
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
      <FilterSection label="Min Seats" icon="users" active={filters.seats != null}>
        <CustomSelect
          value={filters.seats ? String(filters.seats) : ''}
          onChange={v => handleChange('seats', v ? Number(v) : undefined)}
          options={seatOptions}
          placeholder="Any"
        />
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
