import api from "./api";

export const materialService = {
  getPublicMaterials: async (params = {}) => {
    const response = await api.get("/materials/", { params });
    return response.data;
  },

  getMaterialDetail: async (materialId) => {
    const response = await api.get(`/materials/${materialId}/`);
    return response.data;
  },

  getMyMaterials: async (params = {}) => {
    const response = await api.get("/materials/mine/", { params });
    return response.data;
  },

  getMySubmissions: async (params) => {
    const response = await api.get('/materials/mine/', { params });
    return response.data;
  },

  uploadMaterial: async (formData) => {
    const response = await api.post("/materials/mine/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  updateMaterial: async (submissionId, formData) => {
    const response = await api.patch(`/materials/mine/${submissionId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  withdrawSubmission: async (submissionId) => {
    const response = await api.post(`/materials/mine/${submissionId}/withdraw/`);
    return response.data;
  },

  uploadDynamicLessonMaterial: async (formData) => {
    const response = await api.post("/materials/dynamic-upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  deleteMyMaterial: async (submissionId) => {
    const response = await api.delete(`/materials/mine/${submissionId}/`);
    return response.data;
  },

  downloadMaterial: async (materialId, filename) => {
    const response = await api.get(`/materials/${materialId}/download/`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename || "material_download";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  },

  downloadAttachment: async (attachmentId, filename) => {
    const response = await api.get(`/materials/attachments/${attachmentId}/download/`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename || "attachment_download";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  },

  uploadPPTXDocument: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/documents/pptx/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data; // Returns { id: "...", status: "pending", ... }
  },

  getPPTXDocumentStatus: async (documentId) => {
    const response = await api.get(`/documents/pptx/${documentId}/status/`);
    return response.data; // Returns { id: "...", status: "completed|failed|processing" }
  },


};
