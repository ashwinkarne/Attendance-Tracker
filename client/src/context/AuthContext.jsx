import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize authentication on application mount
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // Attempt to fetch current user profile via active access cookie
        const res = await authService.getMe();
        if (isMounted && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        // Access token might be expired; attempt silent refresh with refresh cookie
        try {
          const refreshRes = await authService.refresh();
          if (isMounted && refreshRes.user) {
            setUser(refreshRes.user);
          }
        } catch (refreshErr) {
          // No active session or refresh token expired/revoked
          if (isMounted) {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for global auth expiration events from axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = async (rollNumber, password) => {
    setAuthError(null);
    try {
      const data = await authService.login({ rollNumber, password });
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signup = async (formData) => {
    setAuthError(null);
    try {
      const data = await authService.signup(formData);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
