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
  register: (username, password) => api.post('/register', { username, password }),
  login: (username, password) => api.post('/login', { username, password }),
  getMe: () => api.get('/me'),
  getUsers: () => api.get('/users'),
  updateUserRole: (userId, role) => api.put(`/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  updateNickname: (nickname) => api.put('/nickname', { nickname }),
  updateSignature: (signature) => api.put('/signature', { signature }),
  getAnnouncements: () => api.get('/announcements'),
  publishAnnouncement: (data) => api.post('/announcements', data),
};

export const scriptsAPI = {
  getCategories: () => api.get('/categories'),
  getScripts: (params) => api.get('/scripts', { params }),
  getScript: (id) => api.get(`/scripts/${id}`),
};

export const favoritesAPI = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (scriptId) => api.post(`/favorites/${scriptId}`),
  removeFavorite: (scriptId) => api.delete(`/favorites/${scriptId}`),
  checkFavorite: (scriptId) => api.get(`/favorites/check/${scriptId}`),
};

export default api;
