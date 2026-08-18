import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { formatLakhOrCrore } from '../../utils/formatCurrency'
import Icon from '../ui/Icon'
import FUEL_COLORS from '../../utils/fuelColors'

// Same base bg/text pairing as the shared FUEL_COLORS map, plus a matching
// border - this page is the only place that outlines the fuel badge.
const FUEL_BORDERS = {
  Petrol: 'border-orange-200',
  Diesel: 'border-blue-200',
  CNG: 'border-teal-200',
  Electric: 'border-green-200',
}
const fuelBadgeClass = (fuel) =>
  `${FUEL_COLORS[fuel] ?? 'bg-gray-100 text-gray-600'} ${FUEL_BORDERS[fuel] ?? 'border-gray-200'}`

// Color/label are relative to the other results in *this* search (see
// `scoreRange`), not a fixed threshold - a single search's top 6 results
// naturally cluster too tightly for any fixed line to tell them apart.
// `t` is 0 (weakest shown) to 1 (strongest); hue is continuous (red→green)
// instead of snapped to a few swatches, so close scores still look distinct.
function matchColor(t) {
  const hue = Math.round(t * 120)
  return {
    bar: `hsl(${hue} 65% 45%)`,
    bg: `hsl(${hue} 65% 94%)`,
    text: `hsl(${hue} 65% 28%)`,
  }
}

function matchLabel(t) {
  if (t >= 0.66) return 'Perfect Match'
  if (t >= 0.33) return 'Great Match'
  return 'Good Match'
}

function PriceAndScore({ car, label, color, align = 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="font-display font-bold text-primary text-base">{formatLakhOrCrore(car.price)}</p>
      {car.mileage && <p className="text-xs text-muted mt-0.5">{car.mileage} km/l</p>}
      <span
        className="mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {label}
      </span>
    </div>
  )
}

export default function ResultCard({ item, rank, scoreRange }) {
  const { car, score, reasons } = item
  const t = scoreRange.max === scoreRange.min ? 1 : (score - scoreRange.min) / (scoreRange.max - scoreRange.min)
  const color = matchColor(t)
  const label = matchLabel(t)
  const isTopPick = rank === 1

  return (
    <div className={`bg-white rounded-2xl overflow-hidden transition-shadow ${
      isTopPick
        ? 'border-2 border-primary shadow-lg'
        : 'shadow-card border border-border hover:shadow-card-hover'
    }`}>
      {isTopPick && (
        <div className="bg-primary px-4 py-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-white text-xs font-bold uppercase tracking-widest">
            <Icon name="star" className="w-3.5 h-3.5" filled />
            Top Pick for You
          </span>
          <span className="ml-auto text-teal-200 text-xs">Best match based on your preferences</span>
        </div>
      )}
      <div className={`p-4 ${isTopPick ? 'bg-primary/5' : ''}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Rank badge */}
          <div className={`shrink-0 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center mt-0.5 ${
            isTopPick ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-1' : 'bg-primary text-white'
          }`}>
            {rank}
          </div>

          {/* Image */}
          {car.image_url ? (
            <img src={car.image_url} alt={car.model} className="w-16 h-12 sm:w-24 sm:h-16 object-cover rounded-xl shrink-0 border border-border" />
          ) : (
            <div className="w-16 h-12 sm:w-24 sm:h-16 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
              <Icon name="car" className="w-7 h-7 sm:w-9 sm:h-9 text-gray-300" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">{car.brand.name}</p>
            <p className="font-display font-bold text-gray-900 text-lg leading-tight truncate">{car.model}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {car.year && <span className="text-xs text-muted">{car.year}</span>}
              {car.fuel_type && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${fuelBadgeClass(car.fuel_type)}`}>
                  {car.fuel_type}
                </span>
              )}
              {car.transmission && (
                <span className="text-[11px] text-muted border border-border px-2 py-0.5 rounded-full bg-white">{car.transmission}</span>
              )}
              {car.seats && (
                <span className="text-[11px] text-muted border border-border px-2 py-0.5 rounded-full bg-white">{car.seats} seats</span>
              )}
            </div>
          </div>

          {/* Price + score — desktop only; mobile shows it as a full-width row below instead */}
          <div className="hidden sm:block shrink-0">
            <PriceAndScore car={car} label={label} color={color} />
          </div>
        </div>

        {/* Price + score — mobile only, since it has no room to sit beside a
            long model name once the image/rank badge also claim space */}
        <div className="sm:hidden mt-3 pt-3 border-t border-border">
          <PriceAndScore car={car} label={label} color={color} align="left" />
        </div>
      </div>

      {/* Bar width/color both driven by `t`, floored at 25% so the
          weakest shown result still reads as a real match, not empty. */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${25 + t * 75}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color.bar }}
          />
        </div>
      </div>

      {/* Match reasons */}
      <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
        {reasons.map((r, i) => (
          <span key={i} className="text-[11px] bg-primary/8 text-primary font-medium px-2.5 py-1 rounded-full">
            ✓ {r}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <Link
          to={`/cars/${car.id}`}
          className="flex-1 text-center text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white rounded-lg py-2 transition-colors"
        >
          View Details
        </Link>
        <Link
          to={`/calculator?car_id=${car.id}`}
          className="flex-1 text-center text-xs font-semibold text-gray-600 border border-border hover:border-primary hover:text-primary rounded-lg py-2 transition-colors"
        >
          Cost Calculator
        </Link>
      </div>
    </div>
  )
}
