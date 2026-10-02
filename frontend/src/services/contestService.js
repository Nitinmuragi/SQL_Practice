import api from './api';

export const contestService = {
  // Public & Participant APIs
  getContests: async () => {
    const res = await api.get('/contests');
    return res.data;
  },

  getContestDetail: async (id) => {
    const res = await api.get(`/contests/${id}`);
    return res.data;
  },

  getUserProfileData: async () => {
    const res = await api.get('/contests/profile-data');
    return res.data;
  },

  registerForContest: async (contestId, regData) => {
    const res = await api.post(`/contests/${contestId}/register`, regData);
    return res.data;
  },

  getContestExamRoom: async (contestId) => {
    const res = await api.get(`/contests/${contestId}/room`);
    return res.data;
  },

  submitContestSolution: async (contestId, questionId, sql = '', selectedOption = null) => {
    const res = await api.post(`/contests/${contestId}/submit`, {
      question_id: questionId,
      sql,
      selected_option: selectedOption
    });
    return res.data;
  },

  runTestQuery: async (contestId, questionId, sql = '') => {
    const res = await api.post(`/contests/${contestId}/run`, {
      question_id: questionId,
      sql
    });
    return res.data;
  },

  finishContestAttempt: async (contestId) => {
    const res = await api.post(`/contests/${contestId}/finish`);
    return res.data;
  },

  getContestLeaderboard: async (contestId) => {
    const res = await api.get(`/contests/${contestId}/leaderboard`);
    return res.data;
  },

  getMyContestCertificate: async (contestId, userId = null) => {
    const url = userId ? `/contests/${contestId}/my-certificate?user_id=${userId}` : `/contests/${contestId}/my-certificate`;
    const res = await api.get(url);
    return res.data;
  },

  getContestQuestionEer: async (contestId, questionId) => {
    const res = await api.get(`/contests/${contestId}/questions/${questionId}/eer`);
    return res.data;
  },

  // Admin APIs
  getAdminContests: async () => {
    const res = await api.get('/admin/contests');
    return res.data;
  },

  getAvailableDatasets: async () => {
    const res = await api.get('/admin/contests/available-datasets');
    return res.data;
  },

  createContest: async (contestData) => {
    const res = await api.post('/admin/contests', contestData);
    return res.data;
  },

  updateContest: async (contestId, contestData) => {
    const res = await api.put(`/admin/contests/${contestId}`, contestData);
    return res.data;
  },

  deleteContest: async (contestId) => {
    const res = await api.delete(`/admin/contests/${contestId}`);
    return res.data;
  },

  getContestRegistrations: async (contestId) => {
    const res = await api.get(`/admin/contests/${contestId}/registrations`);
    return res.data;
  },

  finalizeContest: async (contestId) => {
    const res = await api.post(`/admin/contests/${contestId}/finalize`);
    return res.data;
  },

  sendContestReminders: async (contestId) => {
    const res = await api.post(`/admin/contests/${contestId}/send-reminders`);
    return res.data;
  }
};
