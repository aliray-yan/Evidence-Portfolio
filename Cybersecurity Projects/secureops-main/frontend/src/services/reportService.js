import { api, unwrap } from './api';

export const reportService = {
  dashboardStats: () => api.get('/dashboard/stats').then(unwrap),
  alertsTrend: (days = 14) => api.get('/dashboard/alerts-trend', { params: { days } }).then(unwrap),
  recentAlerts: () => api.get('/dashboard/recent-alerts').then(unwrap),
  analystStats: () => api.get('/dashboard/analyst-stats').then(unwrap),
  topThreats: () => api.get('/dashboard/top-threats').then(unwrap),
  deepAnalytics: () => api.get('/dashboard/deep-analytics').then(unwrap),
  list: () => api.get('/reports').then(unwrap),
  generate: (payload) => api.post('/reports/generate', payload).then(unwrap),
  download: (id, format) => api.get(`/reports/${id}/download`, { params: { format }, responseType: 'blob' }),
  email: (id, payload) => api.post(`/reports/${id}/email`, payload).then(unwrap),
  scheduled: () => api.get('/reports/scheduled').then(unwrap)
};
