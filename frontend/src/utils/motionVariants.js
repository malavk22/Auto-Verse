// Shared Motion variants so grids/cards across pages (CarListing, Favorites, ...)
// animate in consistently instead of each page reinventing its own stagger.
export const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

export const gridItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}
