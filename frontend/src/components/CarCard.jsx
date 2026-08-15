import { Link } from 'react-router-dom'
import { formatLakh } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import { useCompare } from '../context/CompareContext'
import FavoriteButton from './FavoriteButton'
import Icon from './ui/Icon'

const FUEL_COLORS = {
  Petrol: 'bg-orange-100 text-orange-700',
  Diesel: 'bg-blue-100 text-blue-700',
  Electric: 'bg-green-100 text-green-700',
  CNG: 'bg-teal-100 text-teal-700',
}

export default function CarCard({ car }) {
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()
  const inCompare = isInCompare(car.id)
  const isFull = compareList.length >= 3 && !inCompare

  const handleCompare = (e) => {
    e.preventDefault()
    inCompare ? removeFromCompare(car.id) : addToCompare(car)
  }

  return (
    <Link
      to={`/cars/${car.id}`}
      className="group bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden flex flex-col"
    >
      <div className="relative h-44 bg-surface-alt flex items-center justify-center overflow-hidden">
        <FavoriteButton car={car} className="absolute top-2 right-2 z-10 w-8 h-8 shadow-card" />
        {(car.image_url || brandImages[car.brand.name]) ? (
          <img
            src={car.image_url || brandImages[car.brand.name]}
            alt={`${car.brand.name} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon name="car" className="w-20 h-20 text-gray-300" />
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">{car.brand.name}</p>
            <h3 className="text-base font-display font-semibold text-gray-900 leading-tight">{car.model}</h3>
          </div>
          {car.fuel_type && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${FUEL_COLORS[car.fuel_type] || 'bg-gray-100 text-gray-600'}`}>
              {car.fuel_type}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted mt-1">
          {car.year && <span>{car.year}</span>}
          {car.transmission && <span>• {car.transmission}</span>}
          {car.seats && <span>• {car.seats} seats</span>}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted">Ex-showroom</p>
            <p className="text-lg font-display font-bold text-primary">{formatLakh(car.price)}</p>
          </div>
          {car.mileage && (
            <div className="text-right">
              <p className="text-xs text-muted">Mileage</p>
              <p className="text-sm font-semibold text-gray-800">{car.mileage} kmpl</p>
            </div>
          )}
        </div>

        <button
          onClick={handleCompare}
          disabled={isFull}
          className={`mt-3 w-full text-xs font-medium py-1.5 rounded border transition-colors ${
            inCompare
              ? 'bg-primary text-white border-primary'
              : 'border-border text-muted hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {inCompare ? '✓ Added to Compare' : '+ Compare'}
        </button>
      </div>
    </Link>
  )
}
