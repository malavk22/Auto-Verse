import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'
import { compareCars } from '../api/cars'
import { formatINR, formatLakh } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'

const SPECS = [
  { label: 'Brand',          render: c => c.brand.name,                                   compare: null },
  { label: 'Model',          render: c => c.model,                                         compare: null },
  { label: 'Year',           render: c => c.year ?? '—',                                   compare: 'higher', raw: c => c.year },
  { label: 'Fuel Type',      render: c => c.fuel_type ?? '—',                              compare: null },
  { label: 'Transmission',   render: c => c.transmission ?? '—',                           compare: null },
  { label: 'Engine',         render: c => c.engine_cc ? `${c.engine_cc} cc` : '—',        compare: 'higher', raw: c => c.engine_cc },
  { label: 'Mileage',        render: c => c.mileage ? `${c.mileage} kmpl` : '—',          compare: 'higher', raw: c => Number(c.mileage) },
  { label: 'Seats',          render: c => c.seats ?? '—',                                  compare: 'higher', raw: c => c.seats },
  { label: 'Ex-showroom',    render: c => formatINR(c.price),                              compare: 'lower',  raw: c => Number(c.price) },
  { label: 'Annual Service', render: c => c.service_cost ? formatINR(c.service_cost) : '—', compare: 'lower', raw: c => Number(c.service_cost) },
]

function cellClass(spec, car, allCars) {
  if (!spec.compare || !spec.raw || allCars.length < 2) return ''
  const vals = allCars.map(c => spec.raw(c)).filter(v => v != null && !isNaN(v))
  if (vals.length < 2) return ''
  const val = spec.raw(car)
  if (val == null || isNaN(val)) return ''
  const best  = spec.compare === 'higher' ? Math.max(...vals) : Math.min(...vals)
  const worst = spec.compare === 'higher' ? Math.min(...vals) : Math.max(...vals)
  if (val === best)  return 'bg-green-50 text-green-700 font-semibold'
  if (val === worst && allCars.length === 3) return 'bg-red-50 text-red-600'
  return ''
}

export default function Compare() {
  const { compareList, clearCompare } = useCompare()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (compareList.length === 0) { setLoading(false); return }
    const ids = compareList.map(c => c.id).join(',')
    compareCars(ids)
      .then(data => { setCars(data); setLoading(false) })
      .catch(() => { setError('Failed to load comparison data.'); setLoading(false) })
  }, [compareList])

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-muted">Loading…</div>
  }

  if (compareList.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">⚖️</p>
        <p className="font-display font-semibold text-gray-800 text-lg mb-2">No cars selected</p>
        <p className="text-sm text-muted mb-6">Add up to 3 cars from the listing to compare them side by side.</p>
        <Link to="/cars" className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
          Browse Cars
        </Link>
      </div>
    )
  }

  if (error) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-error">{error}</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Side-by-Side Comparison</h1>
          <p className="text-sm text-muted mt-1">{cars.length} car{cars.length !== 1 ? 's' : ''} selected</p>
        </div>
        <button onClick={clearCompare} className="text-sm text-error hover:underline">Clear All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">

          {/* Car header */}
          <thead>
            <tr>
              <th className="w-36 pb-6 pr-6 text-left align-bottom">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Specification</span>
              </th>
              {cars.map(car => (
                <th key={car.id} className="pb-6 px-3 min-w-[200px]">
                  <div className="bg-white rounded-xl shadow-card overflow-hidden">
                    <div className="h-40 bg-surface-alt flex items-center justify-center overflow-hidden">
                      {brandImages[car.brand.name] ? (
                        <img
                          src={brandImages[car.brand.name]}
                          alt={car.brand.name}
                          className="w-full h-full object-contain p-3"
                        />
                      ) : (
                        <svg className="w-16 h-16 text-gray-300" fill="currentColor" viewBox="0 0 64 64">
                          <path d="M54 22l-4-8a4 4 0 0 0-3.6-2.2H17.6A4 4 0 0 0 14 14l-4 8A6 6 0 0 0 6 28v8a2 2 0 0 0 2 2h2a6 6 0 0 0 12 0h20a6 6 0 0 0 12 0h2a2 2 0 0 0 2-2v-8a6 6 0 0 0-4-6zM18 40a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm28 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 26l3.2-6.4A2 2 0 0 1 17 18h30a2 2 0 0 1 1.8 1.6L52 26H12z" />
                        </svg>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted uppercase tracking-wide">{car.brand.name}</p>
                      <p className="font-display font-bold text-gray-900 leading-tight mt-0.5">{car.model}</p>
                      <p className="text-primary font-display font-bold text-lg mt-1">{formatLakh(car.price)}</p>
                      <Link
                        to={`/cars/${car.id}`}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        View details →
                      </Link>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Spec rows */}
          <tbody>
            {SPECS.map((spec, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-3.5 pr-6 text-sm font-medium text-muted whitespace-nowrap">{spec.label}</td>
                {cars.map(car => (
                  <td
                    key={car.id}
                    className={`py-3.5 px-3 text-sm text-center rounded transition-colors ${cellClass(spec, car, cars)}`}
                  >
                    {spec.render(car)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {cars.length > 1 && (
        <div className="flex gap-5 mt-6 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
            Best value
          </span>
          {cars.length === 3 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
              Worst value
            </span>
          )}
        </div>
      )}
    </div>
  )
}
