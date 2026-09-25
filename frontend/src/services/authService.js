import api from './api';

export const authService = {
  login: async (identifier, password) => {
    const payload = identifier.includes('@')
      ? { email: identifier, password }
      : { student_id: identifier, password };

    const response = await api.post('/auth/login/', payload);
    return response.data;
  },

  logout: async (refreshToken) => {
    const response = await api.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  updateProfile: async (formData) => {
    // Supports updating personal fields and avatar upload
    const response = await api.patch('/auth/profile/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password/', passwordData);
    return response.data;
  },
};