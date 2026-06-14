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

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
