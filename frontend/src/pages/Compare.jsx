import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useCompare } from '../context/CompareContext'
import { compareCars } from '../api/cars'
import { formatINR, formatLakhOrCrore } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'
import { gridContainer, gridItem } from '../utils/motionVariants'

const RANK_STYLES = [
  { bg: 'bg-amber-400', ring: 'ring-amber-200' },   // 1st
  { bg: 'bg-gray-300', ring: 'ring-gray-200' },      // 2nd
  { bg: 'bg-orange-400', ring: 'ring-orange-200' },  // 3rd
]

function RankBadge({ rank, className = 'w-7 h-7 text-xs' }) {
  const style = RANK_STYLES[rank] ?? RANK_STYLES[2]
  return (
    <motion.span
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.15 + rank * 0.1 }}
      className={`${className} ${style.bg} rounded-full text-white font-bold flex items-center justify-center shrink-0 ring-2 ${style.ring}`}
    >
      {rank + 1}
    </motion.span>
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
  { label: 'Year',           render: c => c.year ?? '—',                                   compare: 'higher', raw: c => c.year,                  delta: d => `${d > 0 ? '+' : ''}${d}` },
  { label: 'Fuel Type',      render: c => c.fuel_type ?? '—',                              compare: null },
  { label: 'Transmission',   render: c => c.transmission ?? '—',                           compare: null },
  { label: 'Engine',         render: c => c.engine_cc ? `${c.engine_cc} cc` : '—',        compare: 'higher', raw: c => c.engine_cc,              delta: d => `${d > 0 ? '+' : ''}${Math.round(d)} cc` },
  { label: 'Mileage',        render: c => c.mileage ? `${c.mileage} kmpl` : '—',          compare: 'higher', raw: c => c.mileage ? Number(c.mileage) : null,       delta: d => `${d > 0 ? '+' : ''}${d.toFixed(1)} kmpl` },
  { label: 'Seats',          render: c => c.seats ?? '—',                                  compare: 'higher', raw: c => c.seats,                  delta: d => `${d > 0 ? '+' : ''}${d}` },
  { label: 'Ex-showroom',    render: c => formatINR(c.price),                              compare: 'lower',  raw: c => Number(c.price),          delta: d => `+${formatLakhOrCrore(d)}` },
  { label: 'Annual Service', render: c => c.service_cost ? formatINR(c.service_cost) : '—', compare: 'lower', raw: c => c.service_cost ? Number(c.service_cost) : null, delta: d => `+${formatLakhOrCrore(d)}` },
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

// The gap between this car's value and the row's best, e.g. "+3.2 kmpl" -
// shown under non-winning cells so color isn't the only signal.
function deltaText(spec, car, allCars) {
  if (!spec.compare || !spec.raw || !spec.delta || allCars.length < 2) return null
  const vals = allCars.map(c => spec.raw(c)).filter(v => v != null && !isNaN(v))
  if (vals.length < 2) return null
  const val = spec.raw(car)
  if (val == null || isNaN(val)) return null
  const best = spec.compare === 'higher' ? Math.max(...vals) : Math.min(...vals)
  if (val === best) return null
  return spec.delta(val - best)
}

// How many of the specs actually differ across the selected cars - quick
// context before scanning the whole table, especially useful when comparing
// near-identical trims of the same model where most rows would be identical.
function countDifferingSpecs(cars) {
  if (cars.length < 2) return { differing: 0, total: SPECS.length }
  const differing = SPECS.filter(spec => new Set(cars.map(c => spec.render(c))).size > 1).length
  return { differing, total: SPECS.length }
}

function CompareSkeleton({ count }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-16 bg-gray-100 rounded" />
      </div>

      {/* Mirrors the real header row's card shape while the compare data loads */}
      <div className={`grid gap-4 grid-cols-1 ${count === 1 ? 'sm:grid-cols-1' : count === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="h-40 bg-gray-100" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 bg-gray-100 rounded mx-auto" />
              <div className="h-4 w-28 bg-gray-200 rounded mx-auto" />
              <div className="h-5 w-20 bg-gray-200 rounded mx-auto mt-1" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}

function AddCompareSlot({ className = '' }) {
  return (
    <Link
      to="/cars"
      className={`flex flex-col items-center justify-center gap-1.5 h-full min-h-[208px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-surface-alt hover:bg-primary/5 text-muted hover:text-primary transition-colors ${className}`}
    >
      <span className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-xl leading-none">+</span>
      <span className="text-xs font-semibold">Add another car</span>
    </Link>
  )
}

// Copies the current URL (kept in sync with the selected cars via the
// `?ids=` param - see the effect in Compare()) so a comparison can be
// bookmarked or sent to someone else. Same share-sheet-first, clipboard-
// fallback pattern as Car Detail's ShareButton.
function ShareCompareLink() {
  const [status, setStatus] = useState(null) // null | 'copied' | 'error'

  const handleClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Car comparison on AutoVerse', url: window.location.href })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('copied')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus(null), 1600)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5"
      >
        <Icon name={status === 'copied' ? 'checkCircle' : status === 'error' ? 'alertTriangle' : 'link'} className="w-4 h-4" />
        Share comparison
      </button>
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-full mt-1.5 right-0 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 ${
              status === 'error' ? 'bg-error' : 'bg-gray-900'
            }`}
          >
            {status === 'error' ? "Couldn't copy" : 'Link copied!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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
  const { compareList, clearCompare, removeFromCompare, replaceCompare } = useCompare()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const theadRef = useRef(null)
  const [showRecap, setShowRecap] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Adopts a shared/bookmarked comparison link once, on first mount, so
  // remove/clear/add-another still work normally afterward. Deliberately
  // `[]` deps - shouldn't re-fire as compareList changes underneath it.
  useEffect(() => {
    const urlIds = searchParams.get('ids')
    if (!urlIds) return
    const idList = urlIds.split(',').filter(Boolean)
    const alreadyMatches = compareList.length === idList.length && compareList.every(c => idList.includes(String(c.id)))
    if (alreadyMatches) return
    compareCars(urlIds)
      .then(data => replaceCompare(data.map(c => ({ id: c.id, brand: c.brand, model: c.model }))))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (compareList.length === 0) { setLoading(false); return }
    const ids = compareList.map(c => c.id).join(',')
    compareCars(ids)
      .then(data => { setCars(data); setLoading(false) })
      .catch(() => { setError('Failed to load comparison data.'); setLoading(false) })
  }, [compareList])

  // Keeps the URL's `?ids=` in sync with what's actually being compared, so
  // a plain copy of the address bar (or the Share button, which just copies
  // `window.location.href`) always points at the right cars - not just
  // whatever was selected when the page first loaded.
  useEffect(() => {
    if (cars.length === 0) return
    const idsParam = cars.map(c => c.id).join(',')
    if (searchParams.get('ids') === idsParam) return
    setSearchParams({ ids: idsParam }, { replace: true })
  }, [cars])

  // Shows the compact recap bar once the real car header has scrolled out of
  // view, so it's still clear which column is which car deep in the spec
  // table - see the comment by `theadRef` for why this isn't plain `sticky`.
  useEffect(() => {
    const el = theadRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowRecap(!entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [cars])

  if (loading) {
    return <CompareSkeleton count={compareList.length} />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Side-by-Side Comparison</h1>
          <p className="text-sm text-muted mt-1">
            {cars.length} car{cars.length !== 1 ? 's' : ''} selected
            {cars.length > 1 && (() => {
              const { differing, total } = countDifferingSpecs(cars)
              return ` · ${differing} of ${total} specs differ`
            })()}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <ShareCompareLink />
          <button onClick={clearCompare} className="text-sm font-semibold text-error hover:underline">Clear All</button>
        </div>
      </div>

      {/* Mobile: each car as its own stacked spec card */}
      <div className="md:hidden space-y-6">
        {cars.map(car => (
          <div key={car.id} className="bg-white rounded-xl shadow-card overflow-hidden relative">
            <button
              onClick={() => removeFromCompare(car.id)}
              aria-label={`Remove ${car.model} from comparison`}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-border flex items-center justify-center text-muted hover:text-error hover:border-error/40 transition-colors"
            >
              <Icon name="xCircle" className="w-4 h-4" />
            </button>
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
                  <span className="text-right">
                    <span className="font-semibold">{spec.render(car)}</span>
                    {deltaText(spec, car, cars) && (
                      <span className="block text-[10px] text-muted font-normal">{deltaText(spec, car, cars)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {cars.length < 3 && <AddCompareSlot />}
      </div>

      {/* Compact recap bar - appears once the real header (with photos) has
          scrolled past, so it's still obvious which car is which while
          reading spec rows further down. `fixed`, not `sticky` - see the
          note by `theadRef` above for why. Portaled straight to
          `document.body` rather than rendered in place: every page is
          wrapped in a `motion.div` (App.jsx's route-transition animation),
          and Motion keeps an inline `transform` on that div even at rest,
          which per spec makes it the containing block for any `fixed`
          descendant instead of the viewport - without the portal this bar
          renders pinned to that wrapper's box, not the screen. */}
      {showRecap && cars.length > 0 && createPortal(
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block fixed top-16 left-0 right-0 z-30 bg-white border-b border-border shadow-card"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
            <span className="w-36 pr-6 text-xs font-semibold text-muted uppercase tracking-wider shrink-0">Comparing</span>
            {cars.map(car => (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                className="flex-1 min-w-[200px] flex items-center gap-2 px-3 hover:opacity-70 transition-opacity"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-alt shrink-0 flex items-center justify-center">
                  <CarThumb car={car} className="w-4 h-4 text-gray-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{car.brand.name} {car.model}</p>
                  <p className="text-xs text-primary font-semibold">{formatLakhOrCrore(car.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>,
        document.body
      )}

      {/* Desktop: side-by-side spec table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">

          {/* Car header. `position: sticky` doesn't work here - the surrounding
              overflow-x-auto wrapper (needed for horizontal scroll on narrow
              desktop widths) implicitly forces overflow-y to `auto` too per the
              CSS overflow spec, which makes this the sticky containing block
              instead of the viewport, and it never actually scrolls internally
              (the page does), so nothing sticks. A separate `fixed` recap bar
              (rendered below, outside this wrapper) fills the same need instead -
              see `theadRef`/`showRecap`. */}
          <thead ref={theadRef}>
            <tr>
              <th className="w-36 pb-6 pr-6 text-left align-bottom">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Specification</span>
              </th>
              {cars.map(car => (
                <th key={car.id} className="pb-6 px-3 min-w-[200px]">
                  <div className="bg-white rounded-xl shadow-card overflow-hidden relative">
                    <button
                      onClick={() => removeFromCompare(car.id)}
                      aria-label={`Remove ${car.model} from comparison`}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-border flex items-center justify-center text-muted hover:text-error hover:border-error/40 transition-colors"
                    >
                      <Icon name="xCircle" className="w-4 h-4" />
                    </button>
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
              {cars.length < 3 && (
                <th className="pb-6 px-3 min-w-[200px]">
                  <AddCompareSlot className="h-[208px]" />
                </th>
              )}
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
                    {deltaText(spec, car, cars) && (
                      <span className="block text-[10px] text-muted font-normal mt-0.5">{deltaText(spec, car, cars)}</span>
                    )}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 bg-white rounded-2xl shadow-card overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center gap-3">
              <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}>
                <Icon name="award" className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="text-white font-display font-bold text-lg leading-tight">Overall Winner</p>
                <p className="text-teal-100 text-xs mt-0.5">Based on head-to-head spec comparison</p>
              </div>
            </div>

            <div className="p-6">
              {/* Winner highlight card */}
              <div className="flex flex-col sm:flex-row gap-5 bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
                <div className="w-full h-32 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  <CarThumb car={winner} className="w-10 h-10 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">{winner.brand.name}</p>
                      <p className="font-display font-bold text-gray-900 text-2xl leading-tight">{winner.model}</p>
                    </div>
                    <motion.div
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 14 }}
                      className="shrink-0"
                    >
                      <Icon name="award" className="w-7 h-7 text-amber-500" />
                    </motion.div>
                  </div>
                  <p className="font-display font-bold text-teal-700 text-lg mt-1">{formatLakhOrCrore(winner.price)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Leads in <span className="font-semibold text-teal-700">{wins[winner.id]}</span> of {totalComparable} comparable specs
                    {isTied && ' · wins tie on price'}
                  </p>
                  {badges[winner.id].length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {badges[winner.id].map((b, j) => (
                        <motion.span
                          key={j}
                          initial={{ opacity: 0, scale: 0.6, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.4 + j * 0.08, type: 'spring', stiffness: 380, damping: 18 }}
                          className="inline-flex items-center gap-1 text-xs bg-teal-100 border border-teal-200 text-teal-800 font-medium px-2.5 py-1 rounded-full"
                        >
                          <motion.span
                            animate={{ rotate: [0, -12, 12, 0] }}
                            transition={{ delay: 0.4 + j * 0.08 + 0.25, duration: 0.4 }}
                          >
                            <Icon name={b.icon} className="w-3.5 h-3.5" />
                          </motion.span>
                          {b.label}
                        </motion.span>
                      ))}
                    </div>
                  )}

                  {/* Why it wins */}
                  {reasons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-teal-200">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-2">Why it wins</p>
                      <div className="space-y-1.5">
                        {reasons.map((r, j) => (
                          <div key={j} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
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
              <motion.div
                variants={gridContainer}
                initial="hidden"
                animate="show"
                className={`grid gap-4 grid-cols-1 ${cars.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
              >
                {ranked.map((car, i) => (
                  <motion.div
                    key={car.id}
                    variants={gridItem}
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
                      <span
                        title={`Leads in ${wins[car.id]} of ${totalComparable} comparable specs`}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          i === 0 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {wins[car.id]} win{wins[car.id] !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Specialty badges */}
                    {badges[car.id].length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {badges[car.id].map((b, j) => (
                          <motion.span
                            key={j}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + i * 0.1 + j * 0.06, type: 'spring', stiffness: 400, damping: 20 }}
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-border px-1.5 py-0.5 rounded-full text-gray-600 font-medium"
                          >
                            <Icon name={b.icon} className="w-3 h-3" />
                            {b.label}
                          </motion.span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted mt-2">No category wins</p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}
