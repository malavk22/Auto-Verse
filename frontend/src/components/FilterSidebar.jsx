import { formatLakh } from '../utils/formatCurrency'

export default function FilterSidebar({ filters, options, onChange, onReset }) {
  const handleChange = (key, value) => onChange({ ...filters, [key]: value, page: 1 })

  return (
    <aside className="w-64 shrink-0 bg-white rounded-lg shadow-card p-5 h-fit sticky top-20">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-gray-900">Filters</h2>
        <button onClick={onReset} className="text-xs text-primary hover:underline">Reset</button>
      </div>

      {/* Brand */}
      <FilterSection label="Brand">
        <select
          value={filters.brand || ''}
          onChange={e => handleChange('brand', e.target.value || undefined)}
          className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All Brands</option>
          {options.brands?.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
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
        <select
          value={filters.seats || ''}
          onChange={e => handleChange('seats', e.target.value ? Number(e.target.value) : undefined)}
          className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Any</option>
          {options.seat_options?.map(s => <option key={s} value={s}>{s}+ seats</option>)}
        </select>
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
