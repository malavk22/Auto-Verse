import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCar } from '../api/cars'
import { formatLakh, formatINR } from '../utils/formatCurrency'

const FUEL_COLORS = {
  Petrol: 'bg-orange-100 text-orange-700',
  Diesel: 'bg-blue-100 text-blue-700',
  Electric: 'bg-green-100 text-green-700',
  CNG: 'bg-teal-100 text-teal-700',
}

function SpecRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 text-sm text-muted w-40 font-medium">{label}</td>
      <td className="py-3 text-sm text-gray-900 font-semibold">{value}</td>
    </tr>
  )
}

export default function CarDetail() {
  const { id } = useParams()
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getCar(id)
      .then(data => { setCar(data); setLoading(false) })
      .catch(() => { setError('Car not found.'); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-card h-96 animate-pulse" />
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">🚫</p>
        <p className="font-medium text-gray-700 mb-4">{error || 'Car not found.'}</p>
        <Link to="/cars" className="text-primary hover:underline text-sm">← Back to listing</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/cars" className="text-sm text-primary hover:underline mb-6 inline-block">← Back to listing</Link>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {/* Hero image placeholder */}
        <div className="h-64 bg-gradient-to-br from-surface-alt to-border flex items-center justify-center">
          <svg className="w-32 h-32 text-gray-300" fill="currentColor" viewBox="0 0 64 64">
            <path d="M54 22l-4-8a4 4 0 0 0-3.6-2.2H17.6A4 4 0 0 0 14 14l-4 8A6 6 0 0 0 6 28v8a2 2 0 0 0 2 2h2a6 6 0 0 0 12 0h20a6 6 0 0 0 12 0h2a2 2 0 0 0 2-2v-8a6 6 0 0 0-4-6zM18 40a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm28 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 26l3.2-6.4A2 2 0 0 1 17 18h30a2 2 0 0 1 1.8 1.6L52 26H12z" />
          </svg>
        </div>

        <div className="p-6 sm:p-8">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wide mb-1">{car.brand.name}</p>
              <h1 className="text-3xl font-display font-bold text-gray-900">{car.model}</h1>
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
            </div>
            <div className="text-right">
              <p className="text-xs text-muted mb-1">Ex-showroom price</p>
              <p className="text-3xl font-display font-bold text-primary">{formatLakh(car.price)}</p>
              <p className="text-sm text-muted">{formatINR(car.price)}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Mileage', value: car.mileage ? `${car.mileage} kmpl` : null },
              { label: 'Engine', value: car.engine_cc ? `${car.engine_cc} cc` : null },
              { label: 'Seats', value: car.seats ? `${car.seats} Seater` : null },
              { label: 'Annual Service', value: car.service_cost ? formatLakh(car.service_cost) : null },
            ].filter(s => s.value).map(s => (
              <div key={s.label} className="bg-surface-alt rounded-lg p-4 text-center">
                <p className="text-xs text-muted mb-1">{s.label}</p>
                <p className="text-base font-display font-semibold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Full spec table */}
          <h2 className="text-lg font-display font-semibold text-gray-900 mb-4">Full Specifications</h2>
          <table className="w-full">
            <tbody>
              <SpecRow label="Brand" value={car.brand.name} />
              <SpecRow label="Model" value={car.model} />
              <SpecRow label="Year" value={car.year} />
              <SpecRow label="Fuel Type" value={car.fuel_type} />
              <SpecRow label="Transmission" value={car.transmission} />
              <SpecRow label="Engine" value={car.engine_cc ? `${car.engine_cc} cc` : null} />
              <SpecRow label="Mileage" value={car.mileage ? `${car.mileage} kmpl` : null} />
              <SpecRow label="Seating" value={car.seats ? `${car.seats} persons` : null} />
              <SpecRow label="Ex-showroom" value={formatINR(car.price)} />
              <SpecRow label="Annual Service" value={car.service_cost ? formatINR(car.service_cost) : null} />
            </tbody>
          </table>

          {/* Metadata */}
          <p className="text-xs text-muted mt-6">
            Viewed {car.view_count} time{car.view_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
