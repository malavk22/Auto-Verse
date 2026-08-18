// Mirrors ResultCard's shape (rank badge, image, info, price/score, reason
// pills) while a search is in flight - same "shaped skeleton" pattern used
// on Compare/Calculator/Browse Cars, instead of the form just sitting there
// with only the button's spinner as a sign anything happened.
export default function ResultsSkeleton({ count = 6 }) {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-card border border-border p-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="w-16 h-12 sm:w-24 sm:h-16 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-2.5 w-16 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="hidden sm:block w-20 space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded ml-auto" />
                <div className="h-3 w-14 bg-gray-100 rounded ml-auto" />
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              <div className="h-5 w-24 bg-gray-100 rounded-full" />
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
