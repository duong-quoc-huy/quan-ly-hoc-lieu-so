import api from './api';

const pendingStarts = new Map();

export const quizService = {
  // Public & Student Endpoints
  getAvailableQuizzes: async (params = {}) => {
    const response = await api.get('/quizzes/available/', { params });
    return response.data;
  },

  getPublicQuiz: async (lessonId) => {
    // Fixed: added /quiz/ suffix to match Django backend route
    const response = await api.get(`/quizzes/lessons/${lessonId}/quiz/`);
    return response.data;
  },

  startAttempt: (lessonId) => {
    const token = localStorage.getItem('access_token') || '';
    const key = `${token}:${lessonId}`;

    if (!pendingStarts.has(key)) {
      const request = api
        // Fixed: added /quiz/ before /attempts/ to match Django backend route
        .post(`/quizzes/lessons/${lessonId}/quiz/attempts/`)
        .then((response) => response.data)
        .finally(() => {
          pendingStarts.delete(key);
        });

      pendingStarts.set(key, request);
    }

    return pendingStarts.get(key);
  },

  submitAttempt: async (attemptId, answers) => {
    const response = await api.post(`/quizzes/attempts/${attemptId}/submit/`, { answers });
    return response.data;
  },

  getMyAttempts: async (params = {}) => {
    const response = await api.get('/quizzes/attempts/mine/', { params });
    return response.data;
  },

  getAttemptDetail: async (attemptId) => {
    const response = await api.get(`/quizzes/attempts/${attemptId}/`);
    return response.data;
  },

  // Teacher Endpoints
  getTeacherQuiz: async (lessonId) => {
    const response = await api.get(`/quizzes/teacher/lessons/${lessonId}/`);
    return response.data;
  },

  saveTeacherQuiz: async (lessonId, quizData) => {
    const response = await api.put(`/quizzes/teacher/lessons/${lessonId}/`, quizData);
    return response.data;
  },

  deleteTeacherQuiz: async (lessonId) => {
    await api.delete(`/quizzes/teacher/lessons/${lessonId}/`);
  },

  getTeacherQuizStats: async (lessonId) => {
    const response = await api.get(`/quizzes/teacher/lessons/${lessonId}/stats/`);
    return response.data;
  },
};