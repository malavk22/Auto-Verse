import { createContext, useContext, useState, useEffect } from 'react'

const CompareContext = createContext()
const STORAGE_KEY = 'autoverse_compare'

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareList))
  }, [compareList])

  const addToCompare = (car) => {
    setCompareList(prev => {
      if (prev.find(c => c.id === car.id) || prev.length >= 3) return prev
      return [...prev, { id: car.id, brand: car.brand, model: car.model }]
    })
  }

  const removeFromCompare = (id) => setCompareList(prev => prev.filter(c => c.id !== id))

  const clearCompare = () => setCompareList([])

  const isInCompare = (id) => compareList.some(c => c.id === id)

  // Bulk-replaces the whole list in one go - used when a shared/bookmarked
  // comparison link (/compare?ids=1,2,3) is opened, so the visitor's local
  // comparison adopts exactly those cars and the usual remove/clear/add
  // actions keep working normally on it afterward, rather than the page
  // just silently rendering something that's disconnected from this context.
  const replaceCompare = (cars) => setCompareList(cars)

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare, replaceCompare }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
