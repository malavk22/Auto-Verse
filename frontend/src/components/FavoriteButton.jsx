import { useFavorites } from '../context/FavoritesContext'

export default function FavoriteButton({ car, className = '' }) {
  const { isFavorited, toggleFavorite } = useFavorites()
  const favorited = isFavorited(car.id)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(car)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      className={`flex items-center justify-center rounded-full transition-colors ${
        favorited
          ? 'bg-white text-error'
          : 'bg-white/90 text-gray-400 hover:text-error'
      } ${className}`}
    >
      <svg
        className="w-[55%] h-[55%]"
        viewBox="0 0 24 24"
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.9.7 5 2.3C11.6 4.7 13.5 3.7 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
      </svg>
    </button>
  )
}
