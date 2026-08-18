// Shaped like a real CarCard instead of a flat gray rectangle, so it reads
// as "loading" rather than "broken". Extracted once Favorites needed the
// same shape CarListing already had.
export default function CarCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
        </div>
        <div className="h-3 w-32 bg-gray-200 rounded" />
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="space-y-1.5">
            <div className="h-2.5 w-16 bg-gray-200 rounded" />
            <div className="h-5 w-20 bg-gray-200 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-12 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-8 w-full bg-gray-200 rounded mt-2" />
      </div>
    </div>
  )
}
