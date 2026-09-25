import api from "./api";

const curriculumService = {
  // --- Faculty Endpoints ---
  getFaculties: async () => {
    const response = await api.get("/curriculum/faculties/");
    return response.data;
  },
  createFaculty: async (data) => {
    const response = await api.post("/curriculum/faculties/", data);
    return response.data;
  },

  // --- Major Endpoints ---
  getMajors: async () => {
    const response = await api.get("/curriculum/majors/");
    return response.data;
  },
  createMajor: async (data) => {
    const response = await api.post("/curriculum/majors/", data);
    return response.data;
  },

  // --- Category / Subject Endpoints ---
  getCategories: async (params = {}) => {
    const response = await api.get("/curriculum/categories/", { params });
    return response.data;
  },
  createCategory: async (data) => {
  const payload = {
    name: data.name,
    slug: data.slug || data.code, // Map slug explicitly
    description: data.description,
    major_id: data.major_id || data.majorId
  };
  const response = await api.post("/curriculum/categories/", payload);
  return response.data;
},  getMyCategories: async () => {
    const response = await api.get("/curriculum/my-categories/");
    return response.data;
  },

  // --- Lesson Endpoints ---
  getLessons: async (params = {}) => {
    const response = await api.get("/curriculum/lessons/", { params });
    return response.data;
  },
  createLesson: async (data) => {
    const response = await api.post("/curriculum/lessons/", data);
    return response.data;
  },

  // --- Teacher Assignment Endpoints ---
  getTeacherAssignments: async (params = {}) => {
    const response = await api.get("/curriculum/teacher-assignments/", { params });
    return response.data;
  },
  assignTeacherToCategory: async (data) => {
    const response = await api.post("/curriculum/teacher-assignments/", data);
    return response.data;
  },
  removeTeacherAssignment: async (assignmentId) => {
    const response = await api.delete(`/curriculum/teacher-assignments/${assignmentId}/`);
    return response.data;
  },

  // --- Account / User Search for Teacher Assignment ---
  searchTeachers: async (query) => {
    const response = await api.get("/auth/users/", {
      params: { role: "teacher", search: query }
    });
    return response.data;
  }
};

export default curriculumService;
