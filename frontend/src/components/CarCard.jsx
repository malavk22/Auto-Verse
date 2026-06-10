import { Link } from 'react-router-dom'
import { formatLakh } from '../utils/formatCurrency'

const FUEL_COLORS = {
  Petrol: 'bg-orange-100 text-orange-700',
  Diesel: 'bg-blue-100 text-blue-700',
  Electric: 'bg-green-100 text-green-700',
  CNG: 'bg-teal-100 text-teal-700',
}

export default function CarCard({ car }) {
  return (
    <Link
      to={`/cars/${car.id}`}
      className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden flex flex-col"
    >
      {/* Placeholder image */}
      <div className="h-44 bg-gradient-to-br from-surface-alt to-border flex items-center justify-center">
        <svg className="w-20 h-20 text-gray-300" fill="currentColor" viewBox="0 0 64 64">
          <path d="M54 22l-4-8a4 4 0 0 0-3.6-2.2H17.6A4 4 0 0 0 14 14l-4 8A6 6 0 0 0 6 28v8a2 2 0 0 0 2 2h2a6 6 0 0 0 12 0h20a6 6 0 0 0 12 0h2a2 2 0 0 0 2-2v-8a6 6 0 0 0-4-6zM18 40a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm28 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 26l3.2-6.4A2 2 0 0 1 17 18h30a2 2 0 0 1 1.8 1.6L52 26H12z" />
        </svg>
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
      </div>
    </Link>
  )
}
