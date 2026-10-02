import api from './api';

export const adminService = {
  async getChallenges() {
    const res = await api.get('/admin/challenges');
    return res.data;
  },

  async getTables() {
    const res = await api.get('/admin/challenges/tables');
    return res.data;
  },

  async validateSolution(targetTable, solutionSql) {
    const res = await api.post('/admin/challenges/validate', {
      target_table: targetTable,
      solution_sql: solutionSql,
    });
    return res.data;
  },

  async createChallenge(challengeData) {
    const res = await api.post('/admin/challenges', challengeData);
    return res.data;
  },

  async updateChallenge(id, challengeData) {
    const res = await api.put(`/admin/challenges/${id}`, challengeData);
    return res.data;
  },

  async deleteChallenge(id) {
    const res = await api.delete(`/admin/challenges/${id}`);
    return res.data;
  },

  // Assessment Management
  async getAssessments(level = 'all') {
    const res = await api.get('/admin/assessments', { params: { level } });
    return res.data;
  },

  async getAssessment(id) {
    const res = await api.get(`/admin/assessments/${id}`);
    return res.data;
  },

  async createAssessment(data) {
    const res = await api.post('/admin/assessments', data);
    return res.data;
  },

  async updateAssessment(id, data) {
    const res = await api.put(`/admin/assessments/${id}`, data);
    return res.data;
  },

  async deleteAssessment(id) {
    const res = await api.delete(`/admin/assessments/${id}`);
    return res.data;
  },
};
