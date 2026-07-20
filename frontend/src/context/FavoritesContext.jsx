import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getFavoriteIds, addFavorite, removeFavorite } from '../api/favorites'

const FavoritesContext = createContext()

export function FavoritesProvider({ children }) {
  const { isAuthenticated, openAuthModal } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  useEffect(() => {
    if (!isAuthenticated) { setFavoriteIds(new Set()); return }
    getFavoriteIds().then(ids => setFavoriteIds(new Set(ids))).catch(() => {})
  }, [isAuthenticated])

  const isFavorited = (carId) => favoriteIds.has(carId)

  const toggleFavorite = (car) => {
    if (!isAuthenticated) { openAuthModal(); return }
    const wasFavorited = favoriteIds.has(car.id)

    setFavoriteIds(prev => {
      const next = new Set(prev)
      wasFavorited ? next.delete(car.id) : next.add(car.id)
      return next
    })

    const revert = () => setFavoriteIds(prev => {
      const next = new Set(prev)
      wasFavorited ? next.add(car.id) : next.delete(car.id)
      return next
    })

    const request = wasFavorited ? removeFavorite(car.id) : addFavorite(car.id)
    request.catch(revert)
  }

  return (
    <FavoritesContext.Provider value={{ isFavorited, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
