// Tracks the last few cars a visitor opened, purely client-side via
// localStorage - no login, no server round-trip.
const KEY = 'autoverse_recently_viewed'
const MAX = 20

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    // Corrupted JSON or localStorage unavailable (private browsing, quota)
    // - treat as empty rather than throwing, this is a nice-to-have.
    return []
  }
}

// Stores just the fields CarCard actually renders, taken straight from the
// already-fetched car detail response - no extra API call needed here or
// when the strip renders it back on Browse Cars.
export function addRecentlyViewed(car) {
  if (!car?.id) return
  const entry = {
    id: car.id,
    brand: { name: car.brand?.name },
    model: car.model,
    year: car.year,
    price: car.price,
    fuel_type: car.fuel_type,
    transmission: car.transmission,
    seats: car.seats,
    mileage: car.mileage,
    image_url: car.image_url,
  }
  const next = [entry, ...getRecentlyViewed().filter(c => c.id !== car.id)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded or unavailable - skip silently.
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clean up if localStorage isn't available anyway.
  }
}

// Removes a single entry - "Clear all" is a big hammer for "I opened one
// car by mistake" or "don't need this one in my history anymore".
export function removeRecentlyViewed(carId) {
  const next = getRecentlyViewed().filter(c => c.id !== carId)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded or unavailable - skip silently.
  }
  return next
}
