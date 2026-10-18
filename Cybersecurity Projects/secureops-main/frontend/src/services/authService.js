import { api, unwrap } from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(unwrap),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }).then(unwrap),
  me: () => api.get('/users/me').then(unwrap)
};
