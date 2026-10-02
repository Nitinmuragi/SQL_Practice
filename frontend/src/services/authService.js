import api from './api';

export const authService = {
  async register(fullName, email, password, confirmPassword) {
    const res = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    });
    return res.data;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('sql_practice_token');
    localStorage.removeItem('sql_practice_user');
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async updateProfile(fullName) {
    const res = await api.put('/auth/profile', { full_name: fullName });
    return res.data;
  },

  async changePassword(currentPassword, newPassword, confirmNewPassword) {
    const res = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_new_password: confirmNewPassword,
    });
    return res.data;
  },
};
