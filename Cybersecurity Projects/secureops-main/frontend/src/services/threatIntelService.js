import { api, unwrap } from './api';

export const threatIntelService = {
  lookup: (payload) => api.post('/threat-intel/lookup', payload).then(unwrap),
  bulk: (payload) => api.post('/threat-intel/bulk', payload).then(unwrap),
  history: () => api.get('/threat-intel/history').then(unwrap),
  quota: () => api.get('/threat-intel/quota').then(unwrap)
};
