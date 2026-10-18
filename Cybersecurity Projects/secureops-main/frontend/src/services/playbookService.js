import { api, unwrap } from './api';

export const playbookService = {
  list: () => api.get('/playbooks').then(unwrap),
  templates: () => api.get('/playbooks/templates').then(unwrap),
  automationActions: () => api.get('/playbooks/automation-actions').then(unwrap),
  get: (id) => api.get(`/playbooks/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/playbooks/${id}`, payload).then(unwrap),
  execute: (id, payload) => api.post(`/playbooks/${id}/execute`, payload).then(unwrap),
  runStep: (executionId, stepId) => api.post(`/playbooks/executions/${executionId}/step/${stepId}/run`).then(unwrap)
};
