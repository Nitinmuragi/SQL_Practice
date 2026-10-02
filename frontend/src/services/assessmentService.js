import api from './api';

export const assessmentService = {
  // Get all assessments with optional level filter ('beginner', 'intermediate', 'advanced', 'all')
  getAssessments: async (level = 'all') => {
    const res = await api.get('/assessment', { params: { level } });
    return res.data;
  },

  // Get single assessment details and its questions
  getAssessment: async (id) => {
    const res = await api.get(`/assessment/${id}`);
    return res.data;
  },

  // Submit assessment answers for a specific assessment
  submitAssessment: async (id, answers) => {
    const res = await api.post(`/assessment/${id}/submit`, { answers });
    return res.data;
  },

  // Get all earned certificates for current user
  getMyCertificates: async () => {
    const res = await api.get('/assessment/my-certificates');
    return res.data;
  },

  // Legacy fallback aliases
  getQuestions: async () => {
    const res = await api.get('/assessment/questions');
    return res.data;
  },

  getMyCertificate: async () => {
    const res = await api.get('/assessment/my-certificate');
    return res.data;
  },
};
