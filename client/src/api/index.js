import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password, nickname, inviteCode) => api.post('/register', { username, password, nickname, inviteCode }),
  login: (username, password) => api.post('/login', { username, password }),
  getMe: () => api.get('/me'),
  getUsers: () => api.get('/users'),
  updateUserRole: (userId, role) => api.put(`/users/${userId}/role`, { role }),
  updateAvatar: (avatar) => api.put('/users/avatar', { avatar }),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  updateNickname: (nickname) => api.put('/nickname', { nickname }),
  updateSignature: (signature) => api.put('/signature', { signature }),
  getAnnouncements: () => api.get('/announcements'),
  publishAnnouncement: (data) => api.post('/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),
  updateAnnouncement: (id, data) => api.put(`/announcements/${id}`, data),
};

export const scriptsAPI = {
  getCategories: () => api.get('/categories'),
  getNavigation: () => api.get('/navigation'),
  getScripts: (params) => api.get('/scripts', { params }),
  getScript: (id) => api.get(`/scripts/${id}`),
  createScript: (data) => api.post('/scripts', data),
  updateScript: (id, data) => api.put(`/scripts/${id}`, data),
  deleteScript: (id) => api.delete(`/scripts/${id}`),
  pinScript: (id, isPinned) => api.put(`/scripts/${id}/pin`, { is_pinned: isPinned }),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  createNavigation: (data) => api.post('/navigation', data),
  updateNavigation: (id, data) => api.put(`/navigation/${id}`, data),
  deleteNavigation: (id) => api.delete(`/navigation/${id}`),
  updateCategoryNav: (id, navGroup) => api.put(`/categories/${id}/nav`, { nav_group: navGroup }),
};

export const favoritesAPI = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (scriptId) => api.post(`/favorites/${scriptId}`),
  removeFavorite: (scriptId) => api.delete(`/favorites/${scriptId}`),
  checkFavorite: (scriptId) => api.get(`/favorites/check/${scriptId}`),
};

export const inviteAPI = {
  getCodes: () => api.get('/invite-codes'),
  generateCodes: (count) => api.post('/invite-codes', { count }),
  deleteCode: (code) => api.delete(`/invite-codes/${code}`),
};

export default api;
