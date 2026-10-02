import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sql_practice_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('sql_practice_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('sql_practice_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (fullName, email, password, confirmPassword) => {
    const res = await authService.register(fullName, email, password, confirmPassword);
    if (res.success && res.data) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('sql_practice_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
