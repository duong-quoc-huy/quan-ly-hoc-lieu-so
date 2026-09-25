import api from './api';

export const adminService = {
  // System Analytics
  getSystemStats: async () => {
    const response = await api.get('/stats/overview/');
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/audit-logs/', { params });
    return response.data;
  },

  // User Management
  getUsers: async (params = {}) => {
    const response = await api.get('/auth/users/', { params });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/auth/users/create/', userData);
    return response.data;
  },

  deactivateUser: async (userId, reason) => {
    const response = await api.post(`/auth/users/${userId}/deactivate/`, { reason });
    return response.data;
  },

  reactivateUser: async (userId, reason) => {
    const response = await api.post(`/auth/users/${userId}/reactivate/`, { reason });
    return response.data;
  },

  resetUserPassword: async (userId, passwords) => {
    const response = await api.post(`/auth/users/${userId}/reset-password/`, passwords);
    return response.data;
  },

  // Material Censorship & Lock
  getPendingMaterials: async () => {
    const response = await api.get('/moderation/materials/pending/');
    return response.data;
  },

  getAllMaterials: async (params = {}) => {
    const response = await api.get('/moderation/materials/all/', { params });
    return response.data;
  },

  lockMaterial: async (materialId) => {
    const response = await api.post(`/moderation/materials/${materialId}/lock/`);
    return response.data;
  },

  unlockMaterial: async (materialId) => {
    const response = await api.post(`/moderation/materials/${materialId}/unlock/`);
    return response.data;
  },

  approveMaterial: async (materialId, expectedUpdatedAt) => {
    const response = await api.post(`/moderation/materials/${materialId}/approve/`, {
      expected_updated_at: expectedUpdatedAt,
    });
    return response.data;
  },

  rejectMaterial: async (materialId, expectedUpdatedAt, rejectionReason) => {
    const response = await api.post(`/moderation/materials/${materialId}/reject/`, {
      expected_updated_at: expectedUpdatedAt,
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Comment Moderation
  getCommentReports: async () => {
    const response = await api.get('/moderation/reports/');
    return response.data;
  },

  dismissReport: async (reportId) => {
    const response = await api.post(`/moderation/reports/${reportId}/dismiss/`);
    return response.data;
  },

  softDeleteComment: async (commentId, reason) => {
    const response = await api.post(`/moderation/comments/${commentId}/moderate-delete/`, { reason });
    return response.data;
  },

  approveLesson: async (lessonId) => {
    const response = await api.post(`/moderation/lessons/${lessonId}/approve/`);
    return response.data;
  },

  rejectLesson: async (lessonId, reason) => {
    const response = await api.post(`/moderation/lessons/${lessonId}/reject/`, { reason });
    return response.data;
  },

};