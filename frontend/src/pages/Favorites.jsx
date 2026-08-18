import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { getFavorites } from '../api/favorites'
import { useFavorites } from '../context/FavoritesContext'
import CarCard from '../components/CarCard'
import CarCardSkeleton from '../components/ui/CarCardSkeleton'
import EmptyState from '../components/ui/EmptyState'
import { CustomSelect } from '../components/FilterSidebar'
import { gridContainer, gridItem } from '../utils/motionVariants'

// "Recently added" isn't a client-side sort - it's just the order
// getFavorites() already returns (ordered by Favorite.created_at DESC on
// the backend), so it needs no comparator here at all.
const SORT_OPTIONS = [
  { value: 'recent',     label: 'Recently Added' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export default function Favorites() {
  const { isFavorited } = useFavorites()
  const [cars, setCars] = useState(null)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('recent')

  useEffect(() => {
    getFavorites()
      .then(setCars)
      .catch(() => setError('Failed to load favorites. Please try again.'))
  }, [])

  const visibleCars = cars?.filter(car => isFavorited(car.id))
  const sortedCars = sort === 'price_asc'
    ? [...(visibleCars ?? [])].sort((a, b) => Number(a.price) - Number(b.price))
    : sort === 'price_desc'
      ? [...(visibleCars ?? [])].sort((a, b) => Number(b.price) - Number(a.price))
      : visibleCars

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">My Favorites</h1>
          <p className="text-muted mt-1 text-sm">
            {visibleCars?.length
              ? `${visibleCars.length} car${visibleCars.length !== 1 ? 's' : ''} saved`
              : "Cars you've saved for later."}
          </p>
        </div>
        {visibleCars?.length > 1 && (
          <div className="w-full sm:w-56">
            <CustomSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error text-center">{error}</p>}

      {cars === null && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <CarCardSkeleton key={i} />)}
        </div>
      ) : visibleCars?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card">
          <EmptyState
            icon="heart"
            tone="rose"
            title="No favorites yet"
            description="Browse cars and tap the heart icon to save them here."
            action={<Link to="/cars" className="text-sm font-semibold text-primary hover:underline">Browse Cars</Link>}
          />
        </div>
      ) : (
        <motion.div
          key={sort}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {sortedCars?.map(car => (
            <motion.div key={car.id} variants={gridItem}>
              <CarCard car={car} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
