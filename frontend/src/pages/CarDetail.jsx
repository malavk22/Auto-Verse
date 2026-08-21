import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { getCar, getCars, getSimilarCars } from '../api/cars'
import { formatLakhOrCrore, formatINR } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import FavoriteButton from '../components/FavoriteButton'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'
import BackToTopButton from '../components/ui/BackToTopButton'
import CarGallery from '../components/carDetail/CarGallery'
import PriceCard from '../components/carDetail/PriceCard'
import SpecTable from '../components/carDetail/SpecTable'
import SimilarCars from '../components/carDetail/SimilarCars'
import StickyActionBar from '../components/carDetail/StickyActionBar'
import useDocumentMeta from '../hooks/useDocumentMeta'
import { addRecentlyViewed } from '../utils/recentlyViewed'
import FUEL_COLORS from '../utils/fuelColors'
import { gridContainer, gridItem } from '../utils/motionVariants'

const MotionLink = motion.create(Link)

// Echoes the real page's shape (gallery, thumbnail strip, title/price block,
// quick stats grid, spec rows) instead of one flat gray box - same reasoning
// as CarListing's CarCardSkeleton: it should read as "this is loading", not
// "this looks broken", for the beat before the real car data arrives.
function CarDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3.5 w-10 bg-gray-200 rounded" />
        <div className="h-3.5 w-3.5 bg-gray-200 rounded-full" />
        <div className="h-3.5 w-10 bg-gray-200 rounded" />
        <div className="h-3.5 w-3.5 bg-gray-200 rounded-full" />
        <div className="h-3.5 w-16 bg-gray-200 rounded" />
        <div className="h-3.5 w-3.5 bg-gray-200 rounded-full" />
        <div className="h-3.5 w-20 bg-gray-200 rounded" />
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="h-72 sm:h-96 bg-gray-200" />
        <div className="flex gap-2 px-4 py-3 bg-white border-t border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-20 h-14 rounded bg-gray-200" />
          ))}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-5 w-12 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-5 w-20 bg-gray-200 rounded-full" />
              </div>
            </div>
            <div className="w-full sm:w-64 shrink-0 bg-surface-alt rounded-xl p-4 flex flex-col items-end gap-2">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded mb-1" />
              <div className="w-full h-9 bg-gray-200 rounded-lg mt-2" />
              <div className="w-full h-9 bg-gray-200 rounded-lg" />
              <div className="w-full h-9 bg-gray-200 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-alt rounded-lg p-4 space-y-2">
                <div className="h-2.5 w-14 bg-gray-200 rounded mx-auto" />
                <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </div>

          <div className="h-5 w-44 bg-gray-200 rounded mb-4" />
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, g) => (
              <div key={g}>
                <div className="h-2.5 w-28 bg-gray-200 rounded mb-2" />
                <div className="rounded-lg border border-border overflow-hidden">
                  {Array.from({ length: g === 0 ? 3 : 2 }).map((_, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 border-b border-border last:border-0">
                      <div className="h-3.5 w-24 bg-gray-200 rounded" />
                      <div className="h-3.5 w-32 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Shares the current URL - opens the native share sheet on mobile
// (navigator.share), falls back to clipboard-copy on desktop.
function ShareButton({ car, className = '' }) {
  const [status, setStatus] = useState(null) // null | 'copied' | 'error'

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (navigator.share) {
      try {
        await navigator.share({ title: `${car.brand.name} ${car.model}`, url: window.location.href })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
        // Share sheet failed for some other reason - fall through and try
        // clipboard-copy as a backup instead of leaving the click inert.
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('copied')
    } catch {
      // Clipboard API unavailable/blocked (e.g. insecure context) - surface
      // it rather than failing silently, so the click doesn't look inert.
      setStatus('error')
    } finally {
      setTimeout(() => setStatus(null), 1600)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label="Share this car"
        className={`flex items-center justify-center rounded-full border border-border bg-white text-gray-400 hover:text-primary hover:border-primary transition-colors ${className}`}
      >
        <Icon name={status === 'copied' ? 'checkCircle' : status === 'error' ? 'alertTriangle' : 'link'} className="w-[55%] h-[55%]" />
      </button>
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 ${
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

function Crumb() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function CarDetail() {
  const { id } = useParams()
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [variants, setVariants] = useState([])
  const [similar, setSimilar] = useState([])
  const [showStickyBar, setShowStickyBar] = useState(false)
  const priceCardRef = useRef(null)

  const gallery = car
    ? (car.gallery_images?.length ? car.gallery_images : [car.image_url || brandImages[car.brand?.name]].filter(Boolean))
    : []

  useDocumentMeta(car ? {
    title: `${car.brand.name} ${car.model}${car.year ? ` (${car.year})` : ''}`,
    description: [
      formatLakhOrCrore(car.price),
      car.fuel_type,
      car.transmission,
      car.mileage ? `${car.mileage} kmpl` : null,
    ].filter(Boolean).join(' · '),
    image: gallery[0],
  } : {})

  // Price spread for this model across the years already fetched for
  // "Other Years Available" - no extra API call needed. Only shown when
  // there's an actual spread worth mentioning (a single-year model or one
  // where every year happens to cost the same wouldn't say anything useful).
  const priceRange = useMemo(() => {
    if (!car || variants.length === 0) return null
    const prices = [car.price, ...variants.map(v => v.price)].map(Number).filter(p => !isNaN(p))
    if (prices.length < 2) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? null : { min, max }
  }, [car, variants])

  useEffect(() => {
    setLoading(true)
    getCar(id)
      .then(data => { setCar(data); setLoading(false); addRecentlyViewed(data) })
      .catch(() => { setError('Car not found.'); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!car) { setVariants([]); return }
    getCars({ brand: car.brand.name, model: car.model, sort: 'year_desc', limit: 12 })
      .then(data => setVariants((data.items || []).filter(v => v.id !== car.id)))
      .catch(() => setVariants([]))
  }, [car?.id])

  useEffect(() => {
    if (!car) { setSimilar([]); return }
    getSimilarCars(car.id).then(setSimilar).catch(() => setSimilar([]))
  }, [car?.id])

  // Show the sticky bar once the real price/CTA card scrolls out of view.
  // IntersectionObserver on the card itself, not a scroll threshold, so it
  // works regardless of content length above it.
  useEffect(() => {
    if (!car || !priceCardRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: '-64px 0px 0px 0px' }
    )
    observer.observe(priceCardRef.current)
    return () => observer.disconnect()
  }, [car?.id])

  if (loading) {
    return <CarDetailSkeleton />
  }

  if (error || !car) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          icon="alertTriangle"
          tone="amber"
          title={error || 'Car not found.'}
          action={<Link to="/cars" className="text-sm font-semibold text-primary hover:underline">← Back to listing</Link>}
        />
      </div>
    )
  }

  return (
    <>
      <StickyActionBar show={showStickyBar} car={car} image={gallery[0]} />

      <BackToTopButton />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      {/* Breadcrumb - replaces the old plain "← Back to listing" link with a
          real trail (Home / Cars / Brand / Model) so it's clear where this
          page sits in the site, and the brand step is a one-click shortcut
          into that brand's listing without going through the filter UI. */}
      <nav className="flex items-center flex-wrap gap-1.5 text-sm text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <Crumb />
        <Link to="/cars" className="hover:text-primary transition-colors">Cars</Link>
        <Crumb />
        <Link to={`/cars?brand=${encodeURIComponent(car.brand.name)}`} className="hover:text-primary transition-colors">
          {car.brand.name}
        </Link>
        <Crumb />
        <span className="text-gray-700 font-medium truncate max-w-[10rem] sm:max-w-none">{car.model}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <CarGallery car={car} gallery={gallery} />

        <div className="p-6 sm:p-8">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wide mb-1">{car.brand.name}</p>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold text-gray-900">{car.model}</h1>
                <FavoriteButton car={car} className="w-9 h-9 border border-border shrink-0" />
                <ShareButton car={car} className="w-9 h-9 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {car.year && <span className="text-sm text-muted">{car.year}</span>}
                {car.fuel_type && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${FUEL_COLORS[car.fuel_type] || 'bg-gray-100 text-gray-600'}`}>
                    {car.fuel_type}
                  </span>
                )}
                {car.transmission && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {car.transmission}
                  </span>
                )}
              </div>
              {priceRange && (
                <p className="text-xs text-muted mt-2 flex items-center gap-1">
                  <Icon name="tag" className="w-3.5 h-3.5 shrink-0" />
                  {car.model} ranges {formatLakhOrCrore(priceRange.min)} – {formatLakhOrCrore(priceRange.max)} across years
                </p>
              )}
            </div>
            <PriceCard car={car} cardRef={priceCardRef} />
          </div>

          {/* Quick stats */}
          <motion.div
            variants={gridContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Mileage', value: car.mileage ? `${car.mileage} kmpl` : null },
              { label: 'Engine', value: car.engine_cc ? `${car.engine_cc} cc` : null },
              { label: 'Seats', value: car.seats ? `${car.seats} Seater` : null },
              { label: 'Annual Service', value: car.service_cost ? formatINR(car.service_cost) : null },
            ].filter(s => s.value).map(s => (
              <motion.div key={s.label} variants={gridItem} className="bg-surface-alt rounded-lg p-4 text-center">
                <p className="text-xs text-muted mb-1">{s.label}</p>
                <p className="text-base font-display font-semibold text-gray-900">{s.value}</p>
              </motion.div>
            ))}
          </motion.div>

          <SpecTable car={car} />

          {/* Other years available */}
          {variants.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="text-lg font-display font-semibold text-gray-900 mb-4">
                Other Years Available
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {variants.map(v => (
                  <MotionLink
                    key={v.id}
                    to={`/cars/${v.id}`}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="shrink-0 w-40 border border-border rounded-lg p-3 hover:border-primary hover:shadow-card transition-colors"
                  >
                    <p className="text-sm font-display font-bold text-gray-900">{v.year ?? '—'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.fuel_type && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FUEL_COLORS[v.fuel_type] || 'bg-gray-100 text-gray-600'}`}>
                          {v.fuel_type}
                        </span>
                      )}
                      {v.transmission && (
                        <span className="text-[10px] text-muted border border-border px-1.5 py-0.5 rounded-full">
                          {v.transmission}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary mt-2">{formatLakhOrCrore(v.price)}</p>
                    {v.mileage && <p className="text-[11px] text-muted">{v.mileage} kmpl</p>}
                  </MotionLink>
                ))}
              </div>
            </div>
          )}

          <SimilarCars cars={similar} />

          {/* Metadata */}
          <p className="text-xs text-muted mt-6">
            Viewed {car.view_count} time{car.view_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
