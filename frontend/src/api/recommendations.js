import api from './axios'

export const getRecommendations = (data) =>
  api.post('/recommendations', data).then(r => r.data)
