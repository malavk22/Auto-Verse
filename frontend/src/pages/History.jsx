import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import CarCard from '../components/CarCard'
import EmptyState from '../components/ui/EmptyState'
import { gridContainer, gridItem } from '../utils/motionVariants'
import { getRecentlyViewed, clearRecentlyViewed, removeRecentlyViewed } from '../utils/recentlyViewed'

// The full version of Home's "Recently Visited" teaser - purely
// client-side (localStorage), works without login same as the teaser does.
// Lazy-init from storage directly (no loading state needed, unlike
// Favorites which has to wait on a real API call).
export default function History() {
  const [cars, setCars] = useState(getRecentlyViewed)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Recently Visited</h1>
          <p className="text-muted mt-1 text-sm">
            {cars.length
              ? `${cars.length} car${cars.length !== 1 ? 's' : ''} visited`
              : 'Pick up right where you left off.'}
          </p>
        </div>
        {cars.length > 0 && (
          <button
            onClick={() => { clearRecentlyViewed(); setCars([]) }}
            className="text-sm text-muted hover:text-primary underline shrink-0 mt-1"
          >
            Clear all
          </button>
        )}
      </div>

      {cars.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card">
          <EmptyState
            icon="car"
            tone="gray"
            title="No cars visited yet"
            description="Cars you open will show up here so you can find them again."
            action={<Link to="/cars" className="text-sm font-semibold text-primary hover:underline">Browse Cars</Link>}
          />
        </div>
      ) : (
        <motion.div
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          <AnimatePresence>
            {cars.map(car => (
              <motion.div key={car.id} variants={gridItem} exit={{ opacity: 0, scale: 0.9 }} className="relative">
                {/* Top-left, not top-right - CarCard's own FavoriteButton
                    already lives there. "Remove from history" is a
                    different action from "unfavorite", so it gets its own
                    spot rather than fighting for the same corner. */}
                <button
                  onClick={(e) => { e.preventDefault(); setCars(removeRecentlyViewed(car.id)) }}
                  aria-label={`Remove ${car.brand?.name} ${car.model} from history`}
                  className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-card text-gray-400 hover:text-error flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <CarCard car={car} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
