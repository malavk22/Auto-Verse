import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { getBrands, getAutocomplete, getFilterOptions, getHomeHighlights } from '../api/cars'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import { gridContainer, gridItem } from '../utils/motionVariants'
import Icon from '../components/ui/Icon'
import HorizontalScroller from '../components/ui/HorizontalScroller'
import BackToTopButton from '../components/ui/BackToTopButton'
import Counter from '../components/ui/Counter'
import CarCard from '../components/CarCard'
import { getRecentlyViewed } from '../utils/recentlyViewed'

const MotionLink = motion.create(Link)

const FEATURES = [
  { icon: 'search',  title: 'Smart Search',         desc: 'Filter by brand, fuel, budget, seats and more.',   to: '/cars',            highlight: '10,000+ listings' },
  { icon: 'compare', title: 'Side-by-Side Compare', desc: 'Compare up to 3 cars across every spec.',          to: '/compare',         highlight: 'Up to 3 cars' },
  { icon: 'target',  title: 'Recommendations',       desc: 'Tell us your needs — we find the best match.',     to: '/recommendations', highlight: 'Personalized picks' },
  { icon: 'wallet',  title: 'Ownership Calculator',  desc: 'See the true 5-year cost before you buy.',         to: '/calculator',      highlight: '5-year forecast' },
]

// Body type isn't a browsable filter in the sidebar (see backend's
// app/services/body_type.py for why - it's a model-name lookup, not a DB
// column), but it's still the most natural way to shop for a car, so it
// gets its own row of image tiles on Home.
const CATEGORIES = [
  { bodyType: 'SUV',       label: 'SUVs',        desc: 'Space, ground clearance, road presence' },
  { bodyType: 'Sedan',     label: 'Sedans',      desc: 'Comfort-first, boot space, highway cruising' },
  { bodyType: 'Hatchback', label: 'Hatchbacks',  desc: 'Easy to park, easy on fuel' },
  { bodyType: 'MUV',       label: 'Family MUVs', desc: '7-seaters built for road trips' },
]

// Rank badge for the Trending strip - top 3 get an accent "hot" treatment
// (flame icon, gradient fill), the rest a plain numbered pill.
function TrendingBadge({ rank }) {
  const hot = rank <= 3
  return (
    <div
      className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-card ${
        hot ? 'bg-gradient-to-r from-accent to-accent-dark text-white' : 'bg-white/95 text-gray-600 border border-border'
      }`}
    >
      {hot && <Icon name="flame" filled className="w-3 h-3" />}
      #{rank}
    </div>
  )
}

// One stat in the Stats strip: icon badge pops in with a spring a beat
// after the number/label fade up, staggered via `delay` across the row.
function StatItem({ icon, label, delay, small, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center px-3"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: delay + 0.12 }}
        className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2"
      >
        <Icon name={icon} className="w-4 h-4" />
      </motion.div>
      <p className={`font-display font-bold text-primary tabular-nums ${small ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
        {children}
      </p>
      <p className="text-[11px] text-muted mt-1 uppercase tracking-wide font-semibold">{label}</p>
    </motion.div>
  )
}

// Reveal-on-scroll wrapper: animates in once when it enters the viewport,
// never re-triggers on scroll-back so it doesn't feel jumpy on re-visits.
function Reveal({ children, delay = 0, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}
const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function Home() {
  const [search, setSearch]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const [brands, setBrands]           = useState([])
  const [trending, setTrending]       = useState([])
  const [categoryCars, setCategoryCars] = useState({})
  const [brandCounts, setBrandCounts] = useState({})
  const [filterOptions, setFilterOptions] = useState({})
  const [recentlyViewed, setRecentlyViewed] = useState(getRecentlyViewed)
  const navigate   = useNavigate()
  const wrapperRef = useRef(null)

  // Same cross-tab sync as Car Detail's own write path relies on - a Home
  // tab already open when a car is viewed in another tab wouldn't
  // otherwise know about it until a full reload.
  useEffect(() => {
    const refresh = () => setRecentlyViewed(getRecentlyViewed())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // A plain `.catch(() => {})` used to leave the stat capsule/brand data
    // stuck empty forever on any single failure. Retries up to 2 times
    // with a growing delay (2s, 5s) - a single retry could still land in
    // the same slow patch as the first attempt. `cancelled` avoids setting
    // state after this Home instance has already unmounted.
    const loadWithRetry = (fetcher, onSuccess, attempt = 0) => {
      fetcher().then(data => { if (!cancelled) onSuccess(data) }).catch(() => {
        if (attempt >= 2) return
        setTimeout(() => {
          if (cancelled) return
          loadWithRetry(fetcher, onSuccess, attempt + 1)
        }, attempt === 0 ? 2000 : 5000)
      })
    }

    loadWithRetry(getBrands, setBrands)
    loadWithRetry(getFilterOptions, setFilterOptions)

    // Trending strip + "Shop by Body Type" tile photos, in one request -
    // see HomeHighlights on the backend for why this isn't several
    // separate /cars calls. Previously had no retry at all (a single
    // failure left this permanently blank) - now shares the same
    // resilience as brands/filter options above.
    loadWithRetry(getHomeHighlights, data => {
      setTrending(data.trending || [])
      setCategoryCars(data.categories || {})
      setBrandCounts(data.brand_model_counts || {})
    })

    return () => { cancelled = true }
  }, [])

  // Debounced autocomplete fetch
  useEffect(() => {
    if (search.trim().length < 2) { setSuggestions([]); setShowDrop(false); return }
    const t = setTimeout(() => {
      getAutocomplete(search.trim())
        .then(data => { setSuggestions(data); setShowDrop(data.length > 0); setActiveIdx(-1) })
        .catch(() => {})
    }, 280)
    return () => clearTimeout(t)
  }, [search])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapperRef.current?.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goTo = (item) => {
    setShowDrop(false)
    setSearch('')
    if (item.type === 'model') navigate(`/cars?search=${encodeURIComponent(item.label)}`)
    else navigate(`/cars?brand=${encodeURIComponent(item.label)}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeIdx >= 0 && suggestions[activeIdx]) { goTo(suggestions[activeIdx]); return }
    if (!search.trim()) return
    setShowDrop(false)
    navigate(`/cars?search=${encodeURIComponent(search.trim())}`)
  }

  const handleKeyDown = (e) => {
    if (!showDrop) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') setShowDrop(false)
  }

  return (
    <div>
      {/* Hero — a flat 2-stop teal gradient (a busier multi-blob version
          was tried and reverted, read as too busy). No `overflow-hidden`
          here - it was clipping the search autocomplete dropdown. */}
      <section className="relative bg-gradient-to-br from-primary to-[#0B4A4A] text-white py-20 px-4">
        <motion.div
          className="relative max-w-3xl mx-auto text-center"
          variants={heroContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={heroItem} className="text-4xl sm:text-5xl font-display font-bold mb-4 leading-tight">
            Find Your Perfect Car<br />
            <span className="text-accent">in India's Market</span>
          </motion.h1>
          <motion.p variants={heroItem} className="text-lg text-teal-100 mb-10">
            Browse {filterOptions.model_count || 100}+ models · Compare specs · Calculate true ownership cost
          </motion.p>

          {/* Search with autocomplete */}
          <motion.div variants={heroItem} ref={wrapperRef} className="relative max-w-xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Search by car name or brand…"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <motion.button
                type="submit"
                disabled={!search.trim()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Search
              </motion.button>
            </form>

            {/* Suggestions dropdown */}
            {showDrop && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 text-left">
                {/* Models */}
                {suggestions.filter(s => s.type === 'model').length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Models</p>
                    {suggestions.filter(s => s.type === 'model').map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => goTo(s)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          suggestions.indexOf(s) === activeIdx ? 'bg-primary/8 text-primary' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{s.label}</span>
                        <span className="text-xs text-gray-400">{s.brand}</span>
                      </button>
                    ))}
                  </>
                )}
                {/* Brands */}
                {suggestions.filter(s => s.type === 'brand').length > 0 && (
                  <>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">Brands</p>
                    {suggestions.filter(s => s.type === 'brand').map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => goTo(s)}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                          suggestions.indexOf(s) === activeIdx ? 'bg-primary/8 text-primary' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Brand</span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </>
                )}
                {/* Press enter hint */}
                <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
                  Press Enter to search all results for "<span className="font-medium text-gray-500">{search}</span>"
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative bg-surface-alt py-12 px-4 overflow-hidden">
        {/* Soft radial wash behind the capsule - decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[12rem] bg-primary/[0.08] blur-3xl rounded-full"
        />
        {/* A floating "capsule" card rather than a flush band - fully
            rounded ends on desktop (a wide, short rectangle capped at
            rounded-full reads as a cylinder/pill), scaling back to a
            regular rounded card on mobile where the 2-row grid is closer
            to square and a true pill would clip the content. */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-4xl mx-auto bg-white rounded-[2rem] sm:rounded-full shadow-lg border border-border/70 px-6 sm:px-10 py-7 sm:py-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 sm:divide-x-2 sm:divide-primary/15">
            <StatItem icon="car" label="Car Listings" delay={0}>
              <Counter target={10000} suffix="+" triggerOnView />
            </StatItem>
            <StatItem icon="building" label="Brands" delay={0.08}>
              <Counter target={brands.length} triggerOnView />
            </StatItem>
            <StatItem icon="fuel" label="Fuel Types" delay={0.16}>
              <Counter target={filterOptions.fuel_types?.length || 0} triggerOnView />
            </StatItem>
            <StatItem icon="tag" label="Price Range" delay={0.24} small>
              {filterOptions.min_price ? (
                // Each value wrapped so it can only ever break at the dash
                // (if it must break at all) - never inside "₹1.36 Cr".
                <span className="inline-flex flex-wrap items-baseline justify-center gap-x-1">
                  <span className="whitespace-nowrap"><Counter target={Number(filterOptions.min_price)} format={formatLakhOrCrore} triggerOnView /></span>
                  <span>–</span>
                  <span className="whitespace-nowrap"><Counter target={Number(filterOptions.max_price)} format={formatLakhOrCrore} triggerOnView /></span>
                </span>
              ) : '—'}
            </StatItem>
          </div>
        </motion.div>
      </section>

      {/* Recently Visited - purely client-side (localStorage), no login
          needed. Fixed to a small 4-card non-scrolling row; "View all"
          routes to /history for the rest. Kept lighter than Trending
          below so it reads as a quick shortcut, not another section. */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <Reveal className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Icon name="history" className="w-4 h-4 text-primary" />
              Recently Visited
            </h2>
            {recentlyViewed.length > 4 && (
              <Link to="/history" className="text-xs font-semibold text-primary hover:underline">
                View all →
              </Link>
            )}
          </Reveal>
          <motion.div
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {recentlyViewed.slice(0, 4).map(car => (
              <motion.div key={car.id} variants={gridItem}>
                <CarCard car={car} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Trending Cars */}
      {trending.length > 0 && (
        <section className="bg-surface-alt py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <Reveal className="flex items-end justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <Icon name="trendingUp" className="w-6 h-6 text-primary" />
                  Trending Right Now
                </h2>
                <p className="text-sm text-muted mt-1">Most-viewed listings across AutoVerse.</p>
              </div>
              <Link to="/cars?sort=popular" className="text-sm font-semibold text-primary hover:underline whitespace-nowrap">
                View all →
              </Link>
            </Reveal>
            <HorizontalScroller className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              <motion.div
                variants={gridContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-80px' }}
                className="flex gap-5"
              >
                {trending.map((car, i) => (
                  <motion.div key={car.id} variants={gridItem} className="relative w-72 shrink-0 snap-start">
                    <TrendingBadge rank={i + 1} />
                    <CarCard car={car} />
                  </motion.div>
                ))}
              </motion.div>
            </HorizontalScroller>
          </div>
        </section>
      )}

      {/* Shop by body type */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <Reveal>
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Icon name="grid" className="w-6 h-6 text-primary" />
            Shop by Body Type
          </h2>
          <p className="text-sm text-muted mb-6">Jump straight to the segment you're after.</p>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((c, i) => {
            const preview = categoryCars[c.bodyType]
            const car = preview?.car
            const img = car ? (car.image_url || brandImages[car.brand.name]) : null
            return (
              <motion.div
                key={c.bodyType}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.08, 0.3) }}
              >
                <MotionLink
                  to={`/cars?body_type=${encodeURIComponent(c.bodyType)}`}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="group relative block h-40 sm:h-48 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-300"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={c.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                  {preview && (
                    <span className="absolute top-2.5 right-2.5 bg-white/90 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-card">
                      {preview.model_count} models
                    </span>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-display font-semibold text-lg leading-tight flex items-center gap-1.5">
                      {c.label}
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </p>
                    <p className="text-white/70 text-xs mt-0.5 hidden sm:block">{c.desc}</p>
                  </div>
                </MotionLink>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Quick brand filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Reveal className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="building" className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-display font-semibold text-gray-900">Browse by Brand</h2>
          </div>
          <p className="text-sm text-muted mb-6">
            {brands.length > 0 ? `${brands.length} brands on AutoVerse - pick one to jump straight in.` : 'Pick a brand to jump straight in.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {brands.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 w-28 rounded-full bg-gray-200 animate-pulse" />
                ))
              : brands.map((brand, i) => (
                  <motion.button
                    key={brand}
                    onClick={() => navigate(`/cars?brand=${encodeURIComponent(brand)}`)}
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22, delay: Math.min(i * 0.025, 0.4) }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border bg-white text-sm font-medium text-gray-700 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors shadow-card"
                  >
                    {brand}
                    {brandCounts[brand] && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full min-w-[1.1rem] text-center">
                        {brandCounts[brand]}
                      </span>
                    )}
                  </motion.button>
                ))}
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center">
            <h2 className="text-2xl font-display font-semibold text-gray-900 mb-10">
              Everything You Need to Buy Smart
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <MotionLink
                  to={f.to}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group block h-full bg-surface-alt rounded-lg p-6 text-center shadow-card hover:shadow-card-hover hover:border-primary/20 border border-transparent transition-shadow duration-300"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: i * 0.08 + 0.15 }}
                    className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:text-white transition-colors"
                  >
                    <Icon name={f.icon} className="w-6 h-6" />
                  </motion.div>
                  <h3 className="font-display font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors flex items-center justify-center gap-1">
                    {f.title}
                    <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">→</span>
                  </h3>
                  <p className="text-sm text-muted mb-3">{f.desc}</p>
                  <span className="inline-block text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {f.highlight}
                  </span>
                </MotionLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - bookends the hero: same flat gradient, echoes its headline
          ("Find Your Perfect Car" -> "Ready to find your perfect car?"),
          closing the page on the same visual note it opened on. */}
      <section className="bg-gradient-to-br from-primary to-[#0B4A4A] py-16 px-4 text-center text-white">
        <Reveal>
          <h2 className="text-3xl font-display font-bold mb-3">Ready to find your perfect car?</h2>
          <p className="text-teal-100 mb-8">
            Over 10,000 listings{brands.length > 0 ? ` · ${brands.length} brands` : ''}{filterOptions.model_count ? ` · ${filterOptions.model_count} models` : ''} — all in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.button
              onClick={() => navigate('/cars')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg"
            >
              Browse All Cars
            </motion.button>
            <motion.button
              onClick={() => navigate('/recommendations')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Get Recommendations
            </motion.button>
          </div>
        </Reveal>
      </section>

      <BackToTopButton />
    </div>
  )
}
