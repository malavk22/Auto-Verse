import api from './axios'

export const getFavoriteIds = () =>
  api.get('/favorites/ids').then(r => r.data.car_ids)

export const getFavorites = () =>
  api.get('/favorites').then(r => r.data)

export const addFavorite = (carId) =>
  api.post(`/favorites/${carId}`)

export const removeFavorite = (carId) =>
  api.delete(`/favorites/${carId}`)
