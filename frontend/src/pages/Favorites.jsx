import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFavorites } from '../api/favorites'
import { useFavorites } from '../context/FavoritesContext'
import CarCard from '../components/CarCard'

export default function Favorites() {
  const { isFavorited } = useFavorites()
  const [cars, setCars] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getFavorites()
      .then(setCars)
      .catch(() => setError('Failed to load favorites. Please try again.'))
  }, [])

  const visibleCars = cars?.filter(car => isFavorited(car.id))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900">My Favorites</h1>
        <p className="text-muted mt-1 text-sm">Cars you've saved for later.</p>
      </div>

      {error && <p className="text-sm text-error text-center">{error}</p>}

      {cars === null && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : visibleCars?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center">
          <p className="text-4xl mb-3">🤍</p>
          <p className="font-medium text-gray-700 mb-2">No favorites yet</p>
          <p className="text-sm text-muted mb-4">Browse cars and tap the heart icon to save them here.</p>
          <Link to="/cars" className="text-sm text-primary font-medium hover:underline">Browse Cars</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleCars?.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      )}
    </div>
  )
}
