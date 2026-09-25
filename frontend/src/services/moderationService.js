import api from './api';

export const moderationService = {
  /**
   * Fetch pending materials for moderation -> GET /api/moderation/materials/pending/
   */
  getPendingMaterials: async (params = {}) => {
    const response = await api.get('/moderation/materials/pending/', { params });
    return response.data;
  },

  /**
   * Fetch all materials (approved, rejected, pending) -> GET /api/moderation/materials/all/
   */
  getAllMaterials: async (params = {}) => {
    const response = await api.get('/moderation/materials/all/', { params });
    return response.data;
  },

  /**
   * Lock a material submission for administrative review -> POST /api/moderation/materials/{id}/lock/
   */
  lockMaterial: async (materialId) => {
    const response = await api.post(`/moderation/materials/${materialId}/lock/`);
    return response.data;
  },

  /**
   * Unlock a material submission -> POST /api/moderation/materials/{id}/unlock/
   */
  unlockMaterial: async (materialId) => {
    const response = await api.post(`/moderation/materials/${materialId}/unlock/`);
    return response.data;
  },

  /**
   * Get review audit history for a material -> GET /api/moderation/materials/{id}/review-history/
   */
  getMaterialHistory: async (materialId) => {
    const response = await api.get(`/moderation/materials/${materialId}/review-history/`);
    return response.data;
  },

  /**
   * Approve a pending material submission -> POST /api/moderation/materials/{id}/approve/
   */
  approveMaterial: async (materialId, payloadOrTimestamp) => {
    const body = typeof payloadOrTimestamp === 'object'
      ? payloadOrTimestamp
      : { expected_updated_at: payloadOrTimestamp };

    const response = await api.post(`/moderation/materials/${materialId}/approve/`, body);
    return response.data;
  },

  /**
   * Reject a pending material submission -> POST /api/moderation/materials/{id}/reject/
   */
  rejectMaterial: async (materialId, payloadOrTimestamp, rejectionReason = '') => {
    const body = typeof payloadOrTimestamp === 'object'
      ? payloadOrTimestamp
      : {
          expected_updated_at: payloadOrTimestamp,
          rejection_reason: rejectionReason,
        };

    const response = await api.post(`/moderation/materials/${materialId}/reject/`, body);
    return response.data;
  },
};