import { useNavigate } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

export default function CompareBar() {
  const { compareList, removeFromCompare } = useCompare()
  const navigate = useNavigate()

  if (compareList.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <p className="text-sm font-semibold text-gray-700 shrink-0">
          Compare ({compareList.length}/3)
        </p>

        <div className="flex gap-3 flex-1 overflow-x-auto">
          {compareList.map(car => (
            <div key={car.id} className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-1.5 text-sm whitespace-nowrap">
              <span className="font-medium text-gray-800">{car.brand.name} {car.model}</span>
              <button
                onClick={() => removeFromCompare(car.id)}
                className="text-muted hover:text-error transition-colors leading-none"
              >
                ✕
              </button>
            </div>
          ))}

          {Array.from({ length: 3 - compareList.length }).map((_, i) => (
            <button
              key={i}
              onClick={() => navigate('/cars')}
              className="flex items-center border border-dashed border-border rounded-lg px-3 py-1.5 text-sm text-muted whitespace-nowrap hover:border-primary hover:text-primary transition-colors"
            >
              + Add a car
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/compare')}
          disabled={compareList.length < 2}
          className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-40 transition-colors shrink-0"
        >
          Compare Now
        </button>
      </div>
    </div>
  )
}
