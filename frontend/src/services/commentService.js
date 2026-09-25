import api from './api';

export const commentService = {
  getComments: async (materialId) => {
    const response = await api.get(`/materials/${materialId}/comments/`);
    return response.data;
  },

  createComment: async (materialId, { content, parent = null }) => {
    const payload = { content };
    if (parent) {
      payload.parent = parent;
    }

    const response = await api.post(`/materials/${materialId}/comments/`, payload);
    return response.data;
  },

  updateComment: async (commentId, content) => {
    const response = await api.patch(`/comments/${commentId}/`, { content });
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}/`);
    return response.data;
  },

  togglePin: async (commentId) => {
    const response = await api.post(`/comments/${commentId}/pin/`);
    return response.data;
  },

  reportComment: async (commentId, reason) => {
    const response = await api.post(`/comments/${commentId}/report/`, { reason });
    return response.data;
  },
};