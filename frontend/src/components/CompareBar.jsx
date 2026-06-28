import { useNavigate } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

export default function CompareBar() {
  const { compareList, removeFromCompare } = useCompare()
  const navigate = useNavigate()
  const empty = compareList.length === 0

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg transition-all duration-300 ${
      empty ? 'bg-gray-50 border-gray-200' : 'bg-white border-primary/30'
    }`}>
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
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {empty ? (
            <p className="text-xs text-gray-400 py-1">
              Click <span className="font-semibold">+ Add to Compare</span> on any car card to compare up to 3 cars side by side
            </p>
          ) : (
            <>
              {compareList.map(car => (
                <div key={car.id} className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1 text-sm whitespace-nowrap">
                  <span className="font-medium text-gray-800 text-xs">{car.brand?.name} {car.model}</span>
                  <button
                    onClick={() => removeFromCompare(car.id)}
                    className="text-gray-400 hover:text-error transition-colors leading-none text-base"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/cars')}
                  className="flex items-center gap-1 border border-dashed border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-400 whitespace-nowrap hover:border-primary hover:text-primary transition-colors"
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
    </div>
  )
}
