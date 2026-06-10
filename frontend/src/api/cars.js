import api from './axios'

export const getCars = (params) => api.get('/cars', { params }).then(r => r.data)

export const getCar = (id) => api.get(`/cars/${id}`).then(r => r.data)

export const getBrands = () => api.get('/cars/brands').then(r => r.data)

export const getFilterOptions = () => api.get('/cars/filters/options').then(r => r.data)
