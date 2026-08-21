import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useCompare } from '../context/CompareContext'

export default function CompareBar() {
  const { compareList, removeFromCompare } = useCompare()
  const navigate = useNavigate()
  const location = useLocation()
  const empty = compareList.length === 0
  // Home is a landing page, not a browsing page - the empty-state hint bar
  // reads as clutter there. Still appears once something's actually added.
  // Reset Password is a focused, single-task auth page - comparing cars is
  // irrelevant there regardless of what's already in the compare list.
  const hidden = (empty && location.pathname === '/') || location.pathname === '/reset-password'

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          key="compare-bar"
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 56, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg transition-colors duration-300 ${
            empty ? 'bg-gray-50 border-gray-200' : 'bg-white border-primary/30'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">

            {/* Label */}
            <div className="shrink-0 flex items-center gap-2">
              <svg className={`w-4 h-4 ${empty ? 'text-gray-400' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className={`text-sm font-semibold ${empty ? 'text-gray-400' : 'text-gray-800'}`}>
                {empty ? 'Compare Cars' : `Compare (${compareList.length}/3)`}
              </span>
            </div>

            {/* Slots */}
            <div className="flex gap-2 flex-1 min-w-0 overflow-x-auto snap-x snap-mandatory">
              {empty ? (
                <>
                  {/* Full hint on desktop - there's room. On mobile the bar's
                      fixed h-14 has nowhere near enough width for this sentence
                      without wrapping past that height and overlapping page
                      content above it, so a short version replaces it instead. */}
                  <p className="hidden sm:block text-xs text-gray-400 py-1">
                    Click <span className="font-semibold">+ Add to Compare</span> on any car card to compare up to 3 cars side by side
                  </p>
                  <p className="sm:hidden text-xs text-gray-400 py-1 truncate">
                    Add cars to compare
                  </p>
                </>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {compareList.map(car => (
                      <motion.div
                        key={car.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8, width: 0 }}
                        animate={{ opacity: 1, scale: 1, width: 'auto' }}
                        exit={{ opacity: 0, scale: 0.8, width: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1 text-sm whitespace-nowrap overflow-hidden shrink-0 snap-start"
                      >
                        <span className="font-medium text-gray-800 text-xs">{car.brand?.name} {car.model}</span>
                        <button
                          onClick={() => removeFromCompare(car.id)}
                          className="text-gray-400 hover:text-error transition-colors leading-none text-base"
                          title="Remove"
                        >
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => navigate('/cars')}
                      className="flex items-center gap-1 border border-dashed border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-400 whitespace-nowrap hover:border-primary hover:text-primary transition-colors shrink-0 snap-start"
                    >
                      + Add car
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Compare button */}
            <button
              onClick={() => navigate('/compare')}
              disabled={compareList.length < 2}
              className="shrink-0 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
            >
              Compare Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
