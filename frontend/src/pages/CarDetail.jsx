import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCar, getCars } from '../api/cars'
import { formatLakh, formatINR } from '../utils/formatCurrency'
import brandImages from '../utils/brandImages'
import { useCompare } from '../context/CompareContext'
import FavoriteButton from '../components/FavoriteButton'
import Icon from '../components/ui/Icon'
import EmptyState from '../components/ui/EmptyState'

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
  const navigate = useNavigate()
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [variants, setVariants] = useState([])
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()

  const gallery = car
    ? (car.gallery_images?.length ? car.gallery_images : [car.image_url || brandImages[car.brand?.name]].filter(Boolean))
    : []

  const prev = useCallback(() => setActiveImg(i => (i - 1 + gallery.length) % gallery.length), [gallery.length])
  const next = useCallback(() => setActiveImg(i => (i + 1) % gallery.length), [gallery.length])

  useEffect(() => {
    setLoading(true)
    getCar(id)
      .then(data => { setCar(data); setLoading(false) })
      .catch(() => { setError('Car not found.'); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!car) { setVariants([]); return }
    getCars({ brand: car.brand.name, model: car.model, sort: 'year_desc', limit: 12 })
      .then(data => setVariants((data.items || []).filter(v => v.id !== car.id)))
      .catch(() => setVariants([]))
  }, [car?.id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-card h-96 animate-pulse" />
      </div>
    )
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/cars" className="text-sm text-primary hover:underline mb-6 inline-block">← Back to listing</Link>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {/* Image gallery */}
        <div className="relative bg-surface-alt overflow-hidden">
          <div className="h-72 sm:h-96 flex items-center justify-center overflow-hidden">
            {gallery.length > 0 ? (
              <img
                key={activeImg}
                src={gallery[activeImg]}
                alt={`${car.brand.name} ${car.model} view ${activeImg + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <Icon name="car" className="w-32 h-32 text-gray-300" />
            )}
          </div>

          {/* Prev / Next arrows */}
          {gallery.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              >
                ›
              </button>
            </>
          )}

          {/* Representative image badge */}
          {(() => {
            const cutoffs = { City:2020,Creta:2020,i20:2020,Swift:2018,Baleno:2022,Seltos:2023,Nexon:2023,Venue:2023,Altroz:2021,Thar:2020 }
            const cutoff = cutoffs[car.model]
            return cutoff && car.year && car.year < cutoff ? (
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                Representative image · actual appearance may vary
              </div>
            ) : null
          })()}

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-t border-border">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`view ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wide mb-1">{car.brand.name}</p>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold text-gray-900">{car.model}</h1>
                <FavoriteButton car={car} className="w-9 h-9 border border-border shrink-0" />
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
            </div>
            <div className="text-right">
              <p className="text-xs text-muted mb-1">Ex-showroom price</p>
              <p className="text-3xl font-display font-bold text-primary">{formatLakh(car.price)}</p>
              <p className="text-sm text-muted">{formatINR(car.price)}</p>
              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={() => isInCompare(car.id) ? removeFromCompare(car.id) : addToCompare(car)}
                  disabled={compareList.length >= 3 && !isInCompare(car.id)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                    isInCompare(car.id)
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-gray-700 hover:border-primary hover:text-primary disabled:opacity-40'
                  }`}
                >
                  {isInCompare(car.id) ? '✓ Added to Compare' : '+ Add to Compare'}
                </button>
                <button
                  onClick={() => navigate(`/calculator?car_id=${car.id}`)}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent hover:text-white transition-colors"
                >
                  Calculate Ownership Cost
                </button>
                <button
                  onClick={() => navigate(`/calculator?car_id=${car.id}&tab=emi`)}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  Calculate EMI
                </button>
              </div>
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

          {/* Other years available */}
          {variants.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="text-lg font-display font-semibold text-gray-900 mb-4">
                Other Years Available
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {variants.map(v => (
                  <Link
                    key={v.id}
                    to={`/cars/${v.id}`}
                    className="shrink-0 w-40 border border-border rounded-lg p-3 hover:border-primary hover:shadow-card transition-all"
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
                    <p className="text-sm font-semibold text-primary mt-2">{formatLakh(v.price)}</p>
                    {v.mileage && <p className="text-[11px] text-muted">{v.mileage} kmpl</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <p className="text-xs text-muted mt-6">
            Viewed {car.view_count} time{car.view_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
