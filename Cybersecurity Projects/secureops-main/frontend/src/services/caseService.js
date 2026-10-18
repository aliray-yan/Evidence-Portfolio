import { api, unwrap } from './api';

export const caseService = {
  list: (params) => api.get('/cases', { params }).then(unwrap),
  stats: () => api.get('/cases/stats').then(unwrap),
  board: (params) => api.get('/cases/board', { params }).then(unwrap),
  get: (id) => api.get(`/cases/${id}`).then(unwrap),
  timeline: (id) => api.get(`/cases/${id}/timeline`).then(unwrap),
  alerts: (id) => api.get(`/cases/${id}/alerts`).then(unwrap),
  create: (payload) => api.post('/cases', payload).then(unwrap),
  update: (id, payload) => api.put(`/cases/${id}`, payload).then(unwrap),
  comment: (id, payload) => api.post(`/cases/${id}/comment`, payload).then(unwrap),
  addTask: (id, payload) => api.post(`/cases/${id}/task`, payload).then(unwrap),
  updateTask: (caseId, taskId, payload) => api.put(`/cases/${caseId}/task/${taskId}`, payload).then(unwrap)
};
