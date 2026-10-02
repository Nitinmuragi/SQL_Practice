import api from './api';

export const challengeService = {
  // Get all challenges with optional filters
  getChallenges: async (params = {}) => {
    const res = await api.get('/challenges', { params });
    return res.data;
  },

  // Get challenge detail with schema preview
  getChallenge: async (id) => {
    const res = await api.get(`/challenges/${id}`);
    return res.data;
  },

  // Submit and verify solution
  submitSolution: async (id, sql) => {
    const res = await api.post(`/challenges/${id}/submit`, { sql });
    return res.data;
  },

  // Get user learning stats (XP, streaks, category mastery)
  getLearningStats: async () => {
    const res = await api.get('/challenges/stats');
    return res.data;
  },

  // Explain SQL execution lifecycle
  explainQuery: async (sql) => {
    const res = await api.post('/query/explain', { sql });
    return res.data;
  },

  // Get curated learning tracks with progress
  getLearningTracks: async () => {
    const res = await api.get('/challenges/tracks');
    return res.data;
  },

  // Get daily challenge and streak info
  getDailyChallenge: async () => {
    const res = await api.get('/challenges/daily');
    return res.data;
  },
};
