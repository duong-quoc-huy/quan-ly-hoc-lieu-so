import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch and normalize user profile data
  const fetchProfile = async () => {
    const profileData = await authService.getProfile();
    const normalizedUser = {
      ...profileData,
      must_change_password: Boolean(
        profileData.must_change_password ?? profileData.mustChangePassword
      ),
    };
    setUser(normalizedUser);
    return normalizedUser;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          await fetchProfile();
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return await fetchProfile();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (err) {
        console.error('Logout error', err);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Re-export useAuth hook for backwards compatibility
export { useAuth } from '../hooks/useAuth';