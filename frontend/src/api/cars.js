import api from './axios'

export const getCars = (params) => api.get('/cars', { params }).then(r => r.data)

export const getCar = (id) => api.get(`/cars/${id}`).then(r => r.data)

export const getBrands = () => api.get('/cars/brands').then(r => r.data)

export const getFilterOptions = () => api.get('/cars/filters/options').then(r => r.data)

export const getHomeHighlights = () => api.get('/cars/home/highlights').then(r => r.data)

export const compareCars = (ids) => api.get('/cars/compare', { params: { ids } }).then(r => r.data)

export const getAutocomplete = (q) => api.get('/cars/autocomplete', { params: { q } }).then(r => r.data)

export const getSimilarCars = (id) => api.get(`/cars/${id}/similar`).then(r => r.data)
