import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { formatLakhOrCrore } from '../../utils/formatCurrency'
import { useCompare } from '../../context/CompareContext'
import Icon from '../ui/Icon'

// Condensed sticky bar - appears once the real price/CTA card scrolls out
// of view above the fold, so the key actions (compare, EMI) stay one tap
// away without scrolling back to the top.
export default function StickyActionBar({ show, car, image }) {
  const navigate = useNavigate()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="sticky-car-bar"
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-16 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-border shadow-md"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
            {image && (
              <img src={image} alt="" className="w-9 h-9 rounded object-cover shrink-0 hidden sm:block" />
            )}
            <p className="min-w-0 flex-1 text-sm font-semibold text-gray-900 truncate">
              {car.brand.name} {car.model}
            </p>
            <p className="text-sm font-bold text-primary shrink-0">{formatLakhOrCrore(car.price)}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => isInCompare(car.id) ? removeFromCompare(car.id) : addToCompare(car)}
                disabled={compareList.length >= 3 && !isInCompare(car.id)}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  isInCompare(car.id)
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-gray-700 hover:border-primary hover:text-primary disabled:opacity-40'
                }`}
              >
                <Icon name="compare" className="w-3.5 h-3.5" />
                {isInCompare(car.id) ? 'Added' : 'Compare'}
              </button>
              <button
                onClick={() => navigate(`/calculator?car_id=${car.id}&tab=emi`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              >
                <Icon name="bolt" className="w-3.5 h-3.5" />
                EMI
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
