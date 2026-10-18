import { api, unwrap } from './api';

export const alertService = {
  list: (params) => api.get('/alerts', { params }).then(unwrap),
  stats: () => api.get('/alerts/stats').then(unwrap),
  get: (id) => api.get(`/alerts/${id}`).then(unwrap),
  timeline: (id) => api.get(`/alerts/${id}/timeline`).then(unwrap),
  create: (payload) => api.post('/alerts', payload).then(unwrap),
  update: (id, payload) => api.put(`/alerts/${id}`, payload).then(unwrap),
  assign: (id, assigned_to_id) => api.post(`/alerts/${id}/assign`, { assigned_to_id }).then(unwrap),
  escalate: (id, comment) => api.post(`/alerts/${id}/escalate`, { comment }).then(unwrap),
  comment: (id, comment) => api.post(`/alerts/${id}/comment`, { comment }).then(unwrap),
  bulkAction: (payload) => api.post('/alerts/bulk-action', payload).then(unwrap)
};
