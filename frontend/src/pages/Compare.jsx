import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'
import { compareCars } from '../api/cars'
import { formatINR, formatLakhOrCrore } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'

const RANK_STYLES = [
  { bg: 'bg-amber-400', ring: 'ring-amber-200' },   // 1st
  { bg: 'bg-gray-300', ring: 'ring-gray-200' },      // 2nd
  { bg: 'bg-orange-400', ring: 'ring-orange-200' },  // 3rd
]

function RankBadge({ rank, className = 'w-7 h-7 text-xs' }) {
  const style = RANK_STYLES[rank] ?? RANK_STYLES[2]
  return (
    <span className={`${className} ${style.bg} rounded-full text-white font-bold flex items-center justify-center shrink-0 ring-2 ${style.ring}`}>
      {rank + 1}
    </span>
  )
}

const BADGES = [
  { icon: 'wallet',  label: 'Most Affordable',    compare: 'lower',  raw: c => Number(c.price) },
  { icon: 'fuel',    label: 'Best Mileage',       compare: 'higher', raw: c => Number(c.mileage) },
  { icon: 'sliders', label: 'Lowest Maintenance', compare: 'lower',  raw: c => Number(c.service_cost) },
  { icon: 'bolt',    label: 'Most Powerful',      compare: 'higher', raw: c => c.engine_cc },
  { icon: 'expand',  label: 'Most Spacious',      compare: 'higher', raw: c => c.seats },
  { icon: 'calendar',label: 'Most Recent',        compare: 'higher', raw: c => c.year },
]

function computeWinner(cars) {
  if (cars.length < 2) return null

  const wins    = Object.fromEntries(cars.map(c => [c.id, 0]))
  const badges  = Object.fromEntries(cars.map(c => [c.id, []]))
  const totalComparable = SPECS.filter(s => s.compare && s.raw).length

  // Count spec wins
  SPECS.filter(s => s.compare && s.raw).forEach(spec => {
    const vals = cars
      .map(c => ({ id: c.id, v: spec.raw(c) }))
      .filter(x => x.v != null && !isNaN(x.v))
    if (vals.length < 2) return
    const best = spec.compare === 'higher' ? Math.max(...vals.map(x => x.v)) : Math.min(...vals.map(x => x.v))
    const top  = vals.filter(x => x.v === best)
    if (top.length === 1) wins[top[0].id]++
  })

  // Assign specialty badges (unique winner only)
  BADGES.forEach(badge => {
    const vals = cars
      .map(c => ({ id: c.id, v: badge.raw(c) }))
      .filter(x => x.v != null && !isNaN(x.v) && x.v > 0)
    if (vals.length < 2) return
    const best = badge.compare === 'higher' ? Math.max(...vals.map(x => x.v)) : Math.min(...vals.map(x => x.v))
    const top  = vals.filter(x => x.v === best)
    if (top.length === 1) badges[top[0].id].push({ icon: badge.icon, label: badge.label })
  })

  // Rank: most wins first, tiebreak by price (cheaper = better)
  const ranked = [...cars].sort((a, b) => {
    const d = wins[b.id] - wins[a.id]
    return d !== 0 ? d : Number(a.price) - Number(b.price)
  })

  const isTied  = wins[ranked[0].id] === wins[ranked[1]?.id]
  const winner  = ranked[0]

  // Reasons: specs where winner has the unique best value, with competitor values for context
  const reasons = SPECS.filter(s => s.compare && s.raw).reduce((acc, spec) => {
    const vals = cars
      .map(c => ({ id: c.id, v: spec.raw(c), rendered: spec.render(c) }))
      .filter(x => x.v != null && !isNaN(x.v))
    if (vals.length < 2) return acc
    const best = spec.compare === 'higher' ? Math.max(...vals.map(x => x.v)) : Math.min(...vals.map(x => x.v))
    const top  = vals.filter(x => x.v === best)
    if (top.length === 1 && top[0].id === winner.id) {
      acc.push({
        label:  spec.label,
        value:  top[0].rendered,
        others: vals.filter(x => x.id !== winner.id).map(x => x.rendered),
      })
    }
    return acc
  }, [])

  return { wins, badges, ranked, totalComparable, isTied, reasons }
}

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

function CarThumb({ car, className = 'w-16 h-16 text-gray-300' }) {
  return (car.image_url || brandImages[car.brand.name]) ? (
    <img
      src={car.image_url || brandImages[car.brand.name]}
      alt={`${car.brand.name} ${car.model}`}
      className="w-full h-full object-cover"
    />
  ) : (
    <Icon name="car" className={className} />
  )
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
      <div className="max-w-6xl mx-auto px-4 py-12">
        <EmptyState
          icon="compare"
          tone="gray"
          title="No cars selected"
          description="Add up to 3 cars from the listing to compare them side by side."
          action={
            <Link to="/cars" className="inline-block bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
              Browse Cars
            </Link>
          }
        />
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

      {/* Mobile: each car as its own stacked spec card */}
      <div className="md:hidden space-y-6">
        {cars.map(car => (
          <div key={car.id} className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="h-40 bg-surface-alt flex items-center justify-center overflow-hidden">
              <CarThumb car={car} />
            </div>
            <div className="p-4 text-center border-b border-border">
              <p className="text-xs text-muted uppercase tracking-wide">{car.brand.name}</p>
              <p className="font-display font-bold text-gray-900 text-lg leading-tight">{car.model}</p>
              <p className="text-primary font-display font-bold text-xl mt-1">{formatLakhOrCrore(car.price)}</p>
              <Link to={`/cars/${car.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                View details →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {SPECS.map((spec, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${cellClass(spec, car, cars)}`}>
                  <span className="text-muted font-medium">{spec.label}</span>
                  <span className="font-semibold">{spec.render(car)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: side-by-side spec table */}
      <div className="hidden md:block overflow-x-auto">
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
                      <CarThumb car={car} />
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted uppercase tracking-wide">{car.brand.name}</p>
                      <p className="font-display font-bold text-gray-900 leading-tight mt-0.5">{car.model}</p>
                      <p className="text-primary font-display font-bold text-lg mt-1">{formatLakhOrCrore(car.price)}</p>
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

      {/* Winner Section */}
      {cars.length > 1 && (() => {
        const result = computeWinner(cars)
        if (!result) return null
        const { wins, badges, ranked, totalComparable, isTied, reasons } = result
        const winner = ranked[0]

        return (
          <div className="mt-10 bg-white rounded-2xl shadow-card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center gap-3">
              <Icon name="award" className="w-6 h-6 text-white" />
              <div>
                <p className="text-white font-display font-bold text-lg leading-tight">Overall Winner</p>
                <p className="text-teal-100 text-xs mt-0.5">Based on head-to-head spec comparison</p>
              </div>
            </div>

            <div className="p-6">
              {/* Winner highlight card */}
              <div className="flex gap-5 bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
                <div className="w-36 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  <CarThumb car={winner} className="w-10 h-10 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">{winner.brand.name}</p>
                      <p className="font-display font-bold text-gray-900 text-2xl leading-tight">{winner.model}</p>
                    </div>
                    <Icon name="award" className="w-7 h-7 text-amber-500 shrink-0" />
                  </div>
                  <p className="font-display font-bold text-teal-700 text-lg mt-1">{formatLakhOrCrore(winner.price)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Leads in <span className="font-semibold text-teal-700">{wins[winner.id]}</span> of {totalComparable} comparable specs
                    {isTied && ' · wins tie on price'}
                  </p>
                  {badges[winner.id].length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {badges[winner.id].map((b, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 text-xs bg-teal-100 border border-teal-200 text-teal-800 font-medium px-2.5 py-1 rounded-full"
                        >
                          <Icon name={b.icon} className="w-3.5 h-3.5" />
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Why it wins */}
                  {reasons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-teal-200">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-2">Why it wins</p>
                      <div className="space-y-1.5">
                        {reasons.map((r, j) => (
                          <div key={j} className="flex items-baseline gap-2 text-sm">
                            <span className="text-xs text-gray-400 w-24 shrink-0">{r.label}</span>
                            <span className="font-semibold text-teal-800">{r.value}</span>
                            <span className="text-xs text-gray-400">vs {r.others.join(' · ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/cars/${winner.id}`}
                    className="inline-block mt-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    View {winner.model} →
                  </Link>
                </div>
              </div>

              {/* All cars ranked */}
              <div className={`grid gap-4 grid-cols-1 ${cars.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                {ranked.map((car, i) => (
                  <div
                    key={car.id}
                    className={`rounded-xl p-4 border ${
                      i === 0
                        ? 'border-teal-300 bg-teal-50'
                        : 'border-border bg-surface-alt'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <RankBadge rank={i} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted truncate">{car.brand.name}</p>
                        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{car.model}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        i === 0 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {wins[car.id]}W
                      </span>
                    </div>

                    {/* Specialty badges */}
                    {badges[car.id].length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {badges[car.id].map((b, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-border px-1.5 py-0.5 rounded-full text-gray-600 font-medium"
                          >
                            <Icon name={b.icon} className="w-3 h-3" />
                            {b.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted mt-2">No category wins</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
