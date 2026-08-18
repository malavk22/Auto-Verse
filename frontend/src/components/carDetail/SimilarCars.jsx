import Icon from '../ui/Icon'
import HorizontalScroller from '../ui/HorizontalScroller'
import CarCard from '../CarCard'

// Same body-type + price band first, then same brand, then closest price
// overall (see backend's tiered /cars/{id}/similar), so there's a genuine
// "you might also like" beyond just other years of this exact model.
export default function SimilarCars({ cars }) {
  if (cars.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h2 className="text-lg font-display font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="compare" className="w-5 h-5 text-primary" />
        Similar Cars
      </h2>
      <HorizontalScroller fadeFrom="from-white" className="flex gap-4 overflow-x-auto pb-2">
        {cars.map(c => (
          <div key={c.id} className="w-64 shrink-0">
            <CarCard car={c} />
          </div>
        ))}
      </HorizontalScroller>
    </div>
  )
}
