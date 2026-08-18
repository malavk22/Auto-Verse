import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import { useCompare } from '../context/CompareContext'
import FavoriteButton from './FavoriteButton'
import Icon from './ui/Icon'
import FUEL_COLORS from '../utils/fuelColors'

const MotionLink = motion.create(Link)

// Denser alternative to CarCard for list view - same data/actions, laid
// out as a row. Compare button drops off below `sm` to avoid cramping.
export default function CarListRow({ car }) {
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()
  const inCompare = isInCompare(car.id)
  const isFull = compareList.length >= 3 && !inCompare

  const handleCompare = (e) => {
    e.preventDefault()
    inCompare ? removeFromCompare(car.id) : addToCompare(car)
  }

  return (
    <MotionLink
      to={`/cars/${car.id}`}
      whileHover={{ x: 3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group flex items-center gap-3 sm:gap-4 bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 p-3 sm:p-4"
    >
      <div className="relative w-20 h-16 sm:w-32 sm:h-24 shrink-0 rounded-md overflow-hidden bg-surface-alt flex items-center justify-center">
        {(car.image_url || brandImages[car.brand.name]) ? (
          <img
            src={car.image_url || brandImages[car.brand.name]}
            alt={`${car.brand.name} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon name="car" className="w-8 h-8 text-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">{car.brand.name}</p>
            <h3 className="text-sm sm:text-base font-display font-semibold text-gray-900 truncate">{car.model}</h3>
          </div>
          {car.fuel_type && (
            <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${FUEL_COLORS[car.fuel_type] || 'bg-gray-100 text-gray-600'}`}>
              {car.fuel_type}
            </span>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-x-2 text-xs text-muted mt-1">
          {car.year && <span>{car.year}</span>}
          {car.transmission && <span>• {car.transmission}</span>}
          {car.seats && <span className="hidden sm:inline">• {car.seats} seats</span>}
          {car.mileage && <span className="hidden sm:inline">• {car.mileage} kmpl</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted hidden sm:block">Ex-showroom</p>
        <p className="text-sm sm:text-lg font-display font-bold text-primary whitespace-nowrap">{formatLakhOrCrore(car.price)}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCompare}
          disabled={isFull}
          className={`hidden sm:block text-xs font-medium px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
            inCompare
              ? 'bg-primary text-white border-primary'
              : 'border-border text-muted hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {inCompare ? '✓ Added' : '+ Compare'}
        </button>
        <FavoriteButton car={car} className="w-8 h-8 border border-border" />
      </div>
    </MotionLink>
  )
}
